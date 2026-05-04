from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import sys
from datetime import datetime
from openai import AzureOpenAI
from dotenv import load_dotenv
import uuid
from sqlalchemy.orm import Session as DBSession

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Import Octopart API and color coding
from octopartapi import OctopartAPI
from colour_azure import apply_color_coding_to_excel
from excelwriter import ExcelWriter
from multi_api_integration import search_component_3api

# Import authentication and database modules
from database import get_db, User, SearchHistory, init_db
from auth_routes import router as auth_router
from auth_middleware import get_current_user

# Load environment variables (for backwards compatibility)
load_dotenv()

# Initialize database on startup
init_db()

app = FastAPI(title="L&T-CORe - Component Obsolescence & Resilience Engine")

# Include authentication routes
app.include_router(auth_router)

# CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,https://eolproject-harish.azurewebsites.net,https://lttseol-harish.azurewebsites.net").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session-based credential storage (in-memory)
# In production, use Redis or a proper session store
user_sessions: Dict[str, Dict] = {}

# Pydantic models for API key configuration
class ApiKeyConfig(BaseModel):
    octopart_client_id: Optional[str] = None
    octopart_client_secret: Optional[str] = None
    azure_openai_key: Optional[str] = None
    azure_openai_endpoint: Optional[str] = None
    azure_openai_deployment: Optional[str] = None
    digikey_client_id: Optional[str] = None
    digikey_client_secret: Optional[str] = None
    mouser_api_key: Optional[str] = None

class ApiKeyConfigResponse(BaseModel):
    success: bool
    session_id: str
    message: str
    configured_apis: Dict[str, bool]

class PriorityMap(BaseModel):
    parameter: str
    priority: int

class AnalyzeRequest(BaseModel):
    eol_part_number: str
    manufacturer: Optional[str] = None
    priority_map: List[PriorityMap]

class PartSpec(BaseModel):
    parameter: str
    value: str

class EOLSpecResponse(BaseModel):
    part_number: str
    specs: List[PartSpec]


# Helper function to get credentials (now globally from .env for everybody)
def get_session_credentials(session_id: str = None) -> Optional[Dict]:
    return {
        'octopart_client_id': os.getenv('OCTOPART_CLIENT_ID'),
        'octopart_client_secret': os.getenv('OCTOPART_CLIENT_SECRET'),
        'azure_openai_key': os.getenv('AZURE_OPENAI_API_KEY'),
        'azure_openai_endpoint': os.getenv('AZURE_OPENAI_ENDPOINT'),
        'azure_openai_deployment': os.getenv('AZURE_OPENAI_DEPLOYMENT'),
        'azure_openai_version': os.getenv('AZURE_OPENAI_API_VERSION', '2025-01-01-preview'),
        'digikey_client_id': os.getenv('DIGIKEY_CLIENT_ID'),
        'digikey_client_secret': os.getenv('DIGIKEY_CLIENT_SECRET'),
        'mouser_api_key': os.getenv('MOUSER_API_KEY')
    }

# Helper function to create OctopartAPI instance
def get_octopart_api_for_session(session_id: str = None):
    creds = get_session_credentials()
    client_id = creds.get('octopart_client_id')
    client_secret = creds.get('octopart_client_secret')
    if client_id and client_secret:
        return OctopartAPI(client_id, client_secret)
    return None


print("=" * 60)
print("L&T-CORe Backend - Session-Based API Configuration")
print("=" * 60)
print("Users will provide their own API keys at login")
print("=" * 60)





@app.get("/api/v1/search-history")
async def get_search_history(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
    limit: int = 50
):
    """
    Get search history for the current authenticated user

    Args:
        current_user: Current authenticated user
        db: Database session
        limit: Maximum number of records to return (default: 50)

    Returns:
        List of search history records
    """
    try:
        # Query search history for current user, ordered by most recent first
        history = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).order_by(
            SearchHistory.searched_at.desc()
        ).limit(limit).all()

        # Format response
        history_data = [
            {
                "id": record.id,
                "part_number": record.part_number,
                "manufacturer": record.manufacturer,
                "searched_at": record.searched_at.isoformat()
            }
            for record in history
        ]

        return {
            "success": True,
            "count": len(history_data),
            "history": history_data
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve search history: {str(e)}"
        )


@app.post("/api/v1/configure_api_keys", response_model=ApiKeyConfigResponse)
async def configure_api_keys(config: ApiKeyConfig):
    """Configure API keys for the current session.

    This endpoint receives API credentials from the user and validates them.
    Returns a session_id that must be used in subsequent API calls.
    """
    try:
        # Resolve credentials (use provided or fallback to environment)
        octopart_id = config.octopart_client_id or os.getenv('OCTOPART_CLIENT_ID')
        octopart_secret = config.octopart_client_secret or os.getenv('OCTOPART_CLIENT_SECRET')
        
        # Validate Octopart credentials
        if not octopart_id or not octopart_secret:
            raise HTTPException(
                status_code=400,
                detail="Octopart credentials are required (either provided or in .env)"
            )

        try:
            test_api = OctopartAPI(octopart_id, octopart_secret)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Octopart credentials: {str(e)}"
            )

        # Generate a unique session ID
        session_id = str(uuid.uuid4())

        # Store credentials in session
        user_sessions[session_id] = {
            'octopart_client_id': octopart_id,
            'octopart_client_secret': octopart_secret,
            'azure_openai_key': config.azure_openai_key or os.getenv('AZURE_OPENAI_API_KEY'),
            'azure_openai_endpoint': config.azure_openai_endpoint or os.getenv('AZURE_OPENAI_ENDPOINT'),
            'azure_openai_deployment': config.azure_openai_deployment or os.getenv('AZURE_OPENAI_DEPLOYMENT'),
            'azure_openai_version': os.getenv('AZURE_OPENAI_API_VERSION', '2025-01-01-preview'),
            'digikey_client_id': config.digikey_client_id or os.getenv('DIGIKEY_CLIENT_ID'),
            'digikey_client_secret': config.digikey_client_secret or os.getenv('DIGIKEY_CLIENT_SECRET'),
            'mouser_api_key': config.mouser_api_key or os.getenv('MOUSER_API_KEY'),
            'created_at': datetime.now().isoformat()
        }

        # Build configured APIs status
        configured_apis = {
            'octopart': True,
            'azure_openai': bool(user_sessions[session_id]['azure_openai_key']),
            'digikey': bool(user_sessions[session_id]['digikey_client_id'] and user_sessions[session_id]['digikey_client_secret']),
            'mouser': bool(user_sessions[session_id]['mouser_api_key'])
        }

        print(f"[INFO] New session created: {session_id[:8]}...")
        print(f"[INFO] Configured APIs: {configured_apis}")

        return ApiKeyConfigResponse(
            success=True,
            session_id=session_id,
            message="API keys configured successfully",
            configured_apis=configured_apis
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Configuration failed: {str(e)}")


@app.get("/api/v1/session_status")
async def session_status(x_session_id: Optional[str] = Header(None)):
    """Return globally configured APIs from .env"""
    creds = get_session_credentials()
    return {
        "valid": True,
        "configured_apis": {
            'octopart': bool(creds.get('octopart_client_id')),
            'azure_openai': bool(creds.get('azure_openai_key')),
            'digikey': bool(creds.get('digikey_client_id') and creds.get('digikey_client_secret')),
            'mouser': bool(creds.get('mouser_api_key'))
        }
    }


@app.get("/api/v1/lookup_eol_specs/{part_number}")
async def lookup_eol_specs(
    part_number: str,
    manufacturer: str = None,
    x_session_id: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """Lookup EOL part specifications from Octopart, with fallback for demo."""
    octopart_api = get_octopart_api_for_session(x_session_id)

    if not octopart_api:
        raise HTTPException(status_code=401, detail="API not configured.")

    try:
        recommendations = octopart_api.search_similar_parts(part_number, limit=3)
        if not recommendations:
            raise HTTPException(status_code=404, detail=f"No parts found for {part_number}")

        eol_part = recommendations[0]
        specs: List[PartSpec] = []
        for key, value in eol_part.items():
            if key not in ['_internal_id', '_source']:
                specs.append(PartSpec(parameter=key, value=str(value)))

        search_record = SearchHistory(
            user_id=current_user.id,
            part_number=part_number,
            manufacturer=manufacturer,
            searched_at=datetime.utcnow()
        )
        db.add(search_record)
        db.commit()

        return EOLSpecResponse(part_number=part_number, specs=specs)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching specs: {str(e)}")

@app.post("/api/v1/find_alternatives")
async def find_alternatives(
    request: AnalyzeRequest,
    x_session_id: Optional[str] = Header(None)
):
    """Fetch alternatives from 3-API integration and return just the part numbers."""
    try:
        # Get credentials
        creds = get_session_credentials(x_session_id)
        
        OCTOPART_CLIENT_ID = creds.get('octopart_client_id', '')
        OCTOPART_CLIENT_SECRET = creds.get('octopart_client_secret', '')
        DIGIKEY_CLIENT_ID = creds.get('digikey_client_id', '')
        DIGIKEY_CLIENT_SECRET = creds.get('digikey_client_secret', '')
        MOUSER_API_KEY = creds.get('mouser_api_key', '')

        octopart_api = get_octopart_api_for_session(x_session_id)
        if not octopart_api:
            raise HTTPException(status_code=401, detail="Octopart API not configured")

        merged_parts = []
        if DIGIKEY_CLIENT_ID or MOUSER_API_KEY:
            merged_parts = search_component_3api(
                octopart_id=OCTOPART_CLIENT_ID,
                octopart_secret=OCTOPART_CLIENT_SECRET,
                digikey_id=DIGIKEY_CLIENT_ID,
                digikey_secret=DIGIKEY_CLIENT_SECRET,
                mouser_key=MOUSER_API_KEY,
                part_number=request.eol_part_number,
                manufacturer=request.manufacturer if request.manufacturer else None,
                limit=5
            )
        else:
            recommendations = octopart_api.search_similar_parts(request.eol_part_number, limit=5)
            for rec in recommendations:
                merged = {}
                merged['MPN'] = rec.get('ManufacturerPartNumber', rec.get('MPN', 'N/A'))
                merged['Manufacturer'] = rec.get('Manufacturer', 'N/A')
                merged_parts.append(merged)

        alternatives = []
        # Skip the first one which is the original part
        for part in merged_parts[1:]:
            alternatives.append({
                "mpn": part.get("MPN", "Unknown"),
                "manufacturer": part.get("Manufacturer", "Unknown")
            })

        return {"alternatives": alternatives}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error finding alternatives: {str(e)}")


@app.post("/api/v1/download_report")
async def download_report(
    request: AnalyzeRequest,
    x_session_id: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user)
):
    """Generate and download color-coded Excel report using 3-API integration.

    Uses Octopart (cached 30 days) + Digi-Key + Mouser (real-time pricing).
    Falls back to Octopart-only if other APIs are not configured.
    Requires user authentication.
    """
    try:
        # Get credentials for this session
        creds = get_session_credentials(x_session_id)
        if not creds:
            raise HTTPException(
                status_code=401,
                detail="API not configured. Please configure your API credentials first."
            )

        # Extract credentials
        OCTOPART_CLIENT_ID = creds.get('octopart_client_id', '')
        OCTOPART_CLIENT_SECRET = creds.get('octopart_client_secret', '')
        DIGIKEY_CLIENT_ID = creds.get('digikey_client_id', '')
        DIGIKEY_CLIENT_SECRET = creds.get('digikey_client_secret', '')
        MOUSER_API_KEY = creds.get('mouser_api_key', '')
        AZURE_OPENAI_KEY = creds.get('azure_openai_key', '')

        # Get Octopart API for this session
        octopart_api = get_octopart_api_for_session(x_session_id)

        if not octopart_api:
            raise HTTPException(status_code=401, detail="Octopart API not configured")

        eol_part_number = request.eol_part_number

        # Try 3-API integration first (if Digi-Key and/or Mouser are configured)
        merged_parts = []

        if DIGIKEY_CLIENT_ID or MOUSER_API_KEY:
            # Use 3-API integration
            print(f"\n[INFO] Using 3-API integration (Octopart + Digi-Key + Mouser)")
            manufacturer_name = request.manufacturer if request.manufacturer else None
            merged_parts = search_component_3api(
                octopart_id=OCTOPART_CLIENT_ID,
                octopart_secret=OCTOPART_CLIENT_SECRET,
                digikey_id=DIGIKEY_CLIENT_ID,
                digikey_secret=DIGIKEY_CLIENT_SECRET,
                mouser_key=MOUSER_API_KEY,
                part_number=eol_part_number,
                manufacturer=manufacturer_name,
                limit=5  # Set to 5 alternatives as requested
            )

            if not merged_parts:
                raise HTTPException(status_code=404, detail="No parts found from 3-API integration")
        else:
            # Fallback to Octopart-only
            print(f"\n[INFO] Using Octopart-only (Digi-Key/Mouser not configured)")
            recommendations = octopart_api.search_similar_parts(eol_part_number, limit=5)
            if not recommendations:
                raise HTTPException(status_code=404, detail="No parts found from Octopart")

            # Convert to merged format
            for rec in recommendations:
                merged = {}
                merged['MPN'] = rec.get('ManufacturerPartNumber', rec.get('MPN', 'N/A'))
                merged['Manufacturer'] = rec.get('Manufacturer', 'N/A')
                merged['Description'] = rec.get('Description', rec.get('ShortDescription', 'N/A'))
                merged['Category'] = rec.get('Category', 'N/A')

                # Add all specs
                for key, value in rec.items():
                    if key not in ['ManufacturerPartNumber', 'MPN', 'Manufacturer', 'Description',
                                  'ShortDescription', 'Category', '_internal_id', '_source']:
                        if not key.startswith('SPEC_'):
                            merged[f'SPEC_{key}'] = value
                        else:
                            merged[key] = value

                merged_parts.append(merged)

        # Create Excel with ExcelWriter (includes color coding)
        excel_writer = ExcelWriter()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_filename = f"EOL_Alternatives_{eol_part_number}_{timestamp}.xlsx"
        # Ensure reports directory exists
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        reports_dir = os.path.join(backend_dir, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        temp_filepath = os.path.join(reports_dir, temp_filename)

        # Use the new create_comparison method directly
        temp_file = temp_filepath.replace('.xlsx', '_temp.xlsx')
        excel_writer.create_comparison(
            parts_data=merged_parts,
            filename=temp_file,
            original_part=eol_part_number
        )

        # Apply color coding with Gemini FFF validation
        final_file = temp_filepath
        try:
            import time
            time.sleep(0.5)

            if AZURE_OPENAI_KEY and merged_parts:
                try:
                    from colour_azure import apply_azure_color_coding_to_excel

                    # Extract EOL part data
                    eol_part_data = {}
                    for key, value in merged_parts[0].items():
                        if key.startswith('SPEC_'):
                            eol_part_data[key] = value
                        elif key not in ['MPN', 'Manufacturer', 'Description', 'Category', '_internal_id', '_source']:
                            eol_part_data[f'SPEC_{key}'] = value

                    # Convert priority_map
                    priority_list = [p.dict() for p in request.priority_map] if request.priority_map else []

                    print(f"\n[INFO] Applying Azure OpenAI FFF color coding...")
                    
                    azure_creds = {
                        'api_key': AZURE_OPENAI_KEY,
                        'endpoint': creds.get('azure_openai_endpoint'),
                        'deployment': creds.get('azure_openai_deployment'),
                        'api_version': creds.get('azure_openai_version')
                    }

                    apply_azure_color_coding_to_excel(
                        temp_file,
                        final_file,
                        eol_part_data,
                        priority_list,
                        azure_creds
                    )
                except ImportError:
                    print(f"[WARNING] Azure color coding module not found, using standard color coding")
                    apply_color_coding_to_excel(temp_file, final_file)
                except Exception as e:
                    import traceback
                    print(f"[WARNING] Azure color coding failed: {e}")
                    traceback.print_exc()
                    apply_color_coding_to_excel(temp_file, final_file)
            else:
                # Fallback to standard color coding
                apply_color_coding_to_excel(temp_file, final_file)

            # Clean up temp file
            if os.path.exists(temp_file):
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        time.sleep(0.3)
                        os.remove(temp_file)
                        break
                    except PermissionError:
                        if attempt < max_retries - 1:
                            time.sleep(0.5)
                else:
                    print(f"[WARNING] Could not delete temp file")
        except Exception as e:
            print(f"[WARNING] Color coding failed: {e}")
            if os.path.exists(temp_file):
                import time
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        time.sleep(0.3)
                        if os.path.exists(final_file):
                            os.remove(final_file)
                        os.rename(temp_file, final_file)
                        break
                    except (PermissionError, OSError):
                        if attempt < max_retries - 1:
                            time.sleep(0.5)

        # Return the color-coded file
        return FileResponse(
            path=final_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=os.path.basename(final_file)
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


async def analyze_with_azure(eol_specs: Dict, candidate_specs: Dict, priority_map: List[Dict], creds: Dict) -> Dict:
    """Use Azure OpenAI to perform FFF validation and color coding decisions"""
    if not creds.get('api_key'):
        return fallback_comparison(eol_specs, candidate_specs)

    try:
        client = AzureOpenAI(
            api_key=creds['api_key'],
            api_version=creds['api_version'],
            azure_endpoint=creds['endpoint']
        )

        # Build prompt
        priority_text = "\n".join([
            f"- {p['parameter']}: Priority {p['priority']} "
            f"({'Must Match' if p['priority'] == 1 else 'Can Differ' if p['priority'] == 2 else 'Cosmetic'})"
            for p in priority_map
        ])

        eol_text = "\n".join([f"- {k}: {v}" for k, v in eol_specs.items() if not k.startswith('_')])
        candidate_text = "\n".join([f"- {k}: {v}" for k, v in candidate_specs.items() if not k.startswith('_')])

        user_prompt = f"""
Compare these electronic component specifications and determine color coding:

EOL Part Specifications:
{eol_text}

Candidate Part Specifications:
{candidate_text}

User Priority Map:
{priority_text}

For each parameter, determine the color:
- "MATCH" (Green): Exact match or functionally equivalent
- "VARIATION" (Yellow): Slight variation that may be acceptable
- "NO_MATCH" (Red): Significant difference or missing data

Return JSON format:
{{
  "comparison_matrix": [
    {{
      "parameter": "parameter_name",
      "eol_value": "value1",
      "candidate_value": "value2",
      "ai_status": "MATCH" | "VARIATION" | "NO_MATCH",
      "reasoning": "explanation"
    }}
  ],
  "overall_status": "MATCH" | "VARIATION" | "NO_MATCH"
}}
"""

        response = client.chat.completions.create(
            model=creds['deployment'],
            messages=[
                {"role": "system", "content": "You are a component engineer."},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )

        import json
        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        print(f"Azure OpenAI API error: {e}")
        return fallback_comparison(eol_specs, candidate_specs)


def fallback_comparison(eol_specs: Dict, candidate_specs: Dict) -> Dict:
    """Fallback comparison without Gemini"""
    comparison = []
    all_params = set(eol_specs.keys()) | set(candidate_specs.keys())

    for param in all_params:
        if param.startswith('_'):
            continue

        eol_val = str(eol_specs.get(param, "N/A"))
        cand_val = str(candidate_specs.get(param, "N/A"))

        if eol_val == cand_val and eol_val != "N/A":
            status = "MATCH"
        elif eol_val != "N/A" and cand_val != "N/A":
            status = "VARIATION"
        else:
            status = "NO_MATCH"

        comparison.append({
            "parameter": param,
            "eol_value": eol_val,
            "candidate_value": cand_val,
            "ai_status": status,
            "reasoning": "Automatic comparison"
        })

    return {
        "comparison_matrix": comparison,
        "overall_status": "VARIATION"
    }


# --- Static file serving for React frontend (production) ---
_base_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_base_dir)
_dist_dir = os.path.join(_backend_dir, "static", "dist")

if os.path.isdir(_dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(_dist_dir, "assets")), name="assets")

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        return FileResponse(os.path.join(_dist_dir, "favicon.ico"))

    @app.get("/", include_in_schema=False)
    async def serve_index():
        """Serve the React SPA index."""
        index_file = os.path.join(_dist_dir, "index.html")
        if os.path.isfile(index_file):
            return HTMLResponse(open(index_file, encoding="utf-8").read())
        return HTMLResponse("<h1>Frontend built but index.html missing</h1>", status_code=500)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve the React SPA for any non-API route."""
        # Check if it's an API route first
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
            
        index_file = os.path.join(_dist_dir, "index.html")
        if os.path.isfile(index_file):
            return HTMLResponse(open(index_file, encoding="utf-8").read())
        return HTMLResponse("<h1>Frontend not built correctly</h1>", status_code=503)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    print("=" * 60)
    print("Starting L&T-CORe - Component Obsolescence & Resilience Engine")
    print("=" * 60)
    print("Session-based API key management enabled")
    print("Users will provide their own API credentials at login")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=port)
