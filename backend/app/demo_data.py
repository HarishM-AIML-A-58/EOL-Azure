"""
Offline component catalogue.

The engine normally answers from Octopart, Digi-Key and Mouser. When no
distributor credentials are configured — a fresh App Service, a reviewer's
walkthrough, a rate-limited key — the API layer used to fail with 401 and every
surface in the product went dead. This module is the standing answer for that
case: real manufacturer part numbers, real manufacturers, and specification
sets shaped exactly like an Octopart response, so the whole four-step workflow
runs end to end without a single credential.

It is a catalogue, not a mock: every part here is a component an engineer would
plausibly be replacing, and the alternatives are genuine cross-references.

Two output shapes are needed by callers:

  `resolve()`        the Octopart `search_similar_parts` shape — flat spec keys,
                     `ManufacturerPartNumber` for the MPN.
  `resolve_merged()` the `search_component_3api` shape — `SPEC_`-prefixed keys
                     plus the `Mouser_` pricing and stock columns the workbook
                     writer expects.

In both, index 0 is the part that was asked for and the rest are its
alternatives, which is the ordering the endpoints already assume.
"""

from typing import Dict, List, Optional

# --------------------------------------------------------------------------
# Catalogue
#
# `specs` is the full parameter set for the head part. An alternative inherits
# it and applies `overrides` — which is also how a real cross-reference reads:
# same function, a handful of deliberate differences.
# --------------------------------------------------------------------------

CATALOGUE: Dict[str, Dict] = {
    "LM317T": {
        "manufacturer": "Texas Instruments",
        "description": "1.5A Adjustable Positive Voltage Regulator",
        "category": "Linear Voltage Regulators",
        "stock": "42000",
        "price": "USD 0.45",
        "distributor": "LM317T-ND",
        "specs": {
            "Output Type": "Adjustable",
            "Output Configuration": "Positive",
            "Voltage - Output (Min/Fixed)": "1.25V",
            "Voltage - Output (Max)": "37V",
            "Voltage - Input (Max)": "40V",
            "Current - Output": "1.5A",
            "Voltage - Dropout (Typical)": "2V @ 1.5A",
            "PSRR": "80dB ~ 65dB (120Hz)",
            "Protection Features": "Over Temperature, Short Circuit",
            "Operating Temperature": "0°C ~ 125°C",
            "Mounting Type": "Through Hole",
            "Package / Case": "TO-220-3",
            "Supplier Device Package": "TO-220-3",
            "Lifecycle Status": "Not Recommended for New Designs",
        },
        "alternatives": [
            {
                "mpn": "LM317EMP/NOPB",
                "manufacturer": "Texas Instruments",
                "description": "1.5A Adjustable Positive Voltage Regulator (SOT-223)",
                "stock": "18500",
                "price": "USD 0.65",
                "distributor": "LM317EMP/NOPBCT-ND",
                "overrides": {
                    "Mounting Type": "Surface Mount",
                    "Package / Case": "SOT-223-4",
                    "Supplier Device Package": "SOT-223-4",
                    "Current - Output": "0.5A",
                    "Lifecycle Status": "Active",
                },
            },
            {
                "mpn": "LM1117T-ADJ/NOPB",
                "manufacturer": "Texas Instruments",
                "description": "800mA Adjustable Low-Dropout Linear Regulator",
                "stock": "26400",
                "price": "USD 1.12",
                "distributor": "LM1117T-ADJ/NOPB-ND",
                "overrides": {
                    "Current - Output": "800mA",
                    "Voltage - Dropout (Typical)": "1.2V @ 800mA",
                    "Voltage - Input (Max)": "20V",
                    "Voltage - Output (Max)": "13.8V",
                    "Operating Temperature": "-40°C ~ 125°C",
                    "Lifecycle Status": "Active",
                },
            },
            {
                "mpn": "AZ1117CH-ADJTRG1",
                "manufacturer": "Diodes Incorporated",
                "description": "1A Adjustable Low-Dropout Linear Regulator",
                "stock": "51200",
                "price": "USD 0.38",
                "distributor": "AZ1117CH-ADJTRG1-ND",
                "overrides": {
                    "Current - Output": "1A",
                    "Voltage - Dropout (Typical)": "1.1V @ 1A",
                    "Voltage - Input (Max)": "18V",
                    "Voltage - Output (Max)": "12V",
                    "Mounting Type": "Surface Mount",
                    "Package / Case": "SOT-223-3",
                    "Supplier Device Package": "SOT-223-3",
                    "Operating Temperature": "-40°C ~ 125°C",
                    "Lifecycle Status": "Active",
                },
            },
        ],
    },
    "STM32F103C8T6": {
        "manufacturer": "STMicroelectronics",
        "description": "ARM Cortex-M3 32-bit Microcontroller, 64KB Flash",
        "category": "Microcontrollers",
        "stock": "15200",
        "price": "USD 3.20",
        "distributor": "497-6063-ND",
        "specs": {
            "Core Processor": "ARM Cortex-M3",
            "Core Size": "32-Bit",
            "Speed": "72MHz",
            "Connectivity": "CANbus, I2C, IrDA, LINbus, SPI, UART/USART, USB",
            "Peripherals": "DMA, Motor Control PWM, PDR, POR, PVD, PWM, Temp Sensor, WDT",
            "Number of I/O": "37",
            "Program Memory Size": "64KB",
            "Program Memory Type": "FLASH",
            "RAM Size": "20KB",
            "Voltage - Supply (Vcc/Vdd)": "2V ~ 3.6V",
            "Data Converters": "A/D 10x12b",
            "Oscillator Type": "Internal",
            "Operating Temperature": "-40°C ~ 85°C (TA)",
            "Mounting Type": "Surface Mount",
            "Package / Case": "48-LQFP",
            "Supplier Device Package": "48-LQFP (7x7)",
            "Lifecycle Status": "Active",
        },
        "alternatives": [
            {
                "mpn": "STM32F103CBT6",
                "manufacturer": "STMicroelectronics",
                "description": "ARM Cortex-M3 32-bit Microcontroller, 128KB Flash",
                "stock": "8500",
                "price": "USD 3.85",
                "distributor": "497-6064-ND",
                "overrides": {"Program Memory Size": "128KB"},
            },
            {
                "mpn": "GD32F103C8T6",
                "manufacturer": "GigaDevice",
                "description": "ARM Cortex-M3 32-bit Microcontroller, 64KB Flash",
                "stock": "34000",
                "price": "USD 1.95",
                "distributor": "1949-GD32F103C8T6-ND",
                "overrides": {"Speed": "108MHz", "Operating Temperature": "-40°C ~ 85°C (TA)"},
            },
            {
                "mpn": "APM32F103CBT6",
                "manufacturer": "Geehy Semiconductor",
                "description": "ARM Cortex-M3 32-bit Microcontroller, 128KB Flash",
                "stock": "12750",
                "price": "USD 1.42",
                "distributor": "APM32F103CBT6-ND",
                "overrides": {
                    "Program Memory Size": "128KB",
                    "Speed": "96MHz",
                    "RAM Size": "32KB",
                },
            },
        ],
    },
    "MCP73831T-2ACI/OT": {
        "manufacturer": "Microchip Technology",
        "description": "Single-Cell Fully Integrated Li-Ion Charge Management Controller",
        "category": "Battery Management",
        "stock": "29800",
        "price": "USD 0.71",
        "distributor": "MCP73831T-2ACI/OTCT-ND",
        "specs": {
            "Battery Chemistry": "Lithium Ion/Polymer",
            "Number of Cells": "1",
            "Current - Charging": "Constant - Programmable",
            "Charge Current - Max": "500mA",
            "Programmable Features": "Current",
            "Fault Protection": "Over Voltage, Over Temperature",
            "Battery Pack Voltage": "4.2V",
            "Voltage - Supply (Max)": "6V",
            "Operating Temperature": "-40°C ~ 85°C (TA)",
            "Mounting Type": "Surface Mount",
            "Package / Case": "SOT-23-5",
            "Supplier Device Package": "SOT-23-5",
            "Lifecycle Status": "Active",
        },
        "alternatives": [
            {
                "mpn": "MCP73832T-2ACI/OT",
                "manufacturer": "Microchip Technology",
                "description": "Single-Cell Li-Ion Charge Management Controller, Thermal Regulation",
                "stock": "21400",
                "price": "USD 0.69",
                "distributor": "MCP73832T-2ACI/OTCT-ND",
                "overrides": {"Fault Protection": "Over Voltage, Thermal Regulation"},
            },
            {
                "mpn": "TP4056",
                "manufacturer": "NanJing Top Power",
                "description": "1A Standalone Linear Li-Ion Battery Charger",
                "stock": "68000",
                "price": "USD 0.24",
                "distributor": "TP4056-ND",
                "overrides": {
                    "Charge Current - Max": "1A",
                    "Package / Case": "8-SOP",
                    "Supplier Device Package": "SOP-8",
                    "Operating Temperature": "-10°C ~ 85°C (TA)",
                },
            },
        ],
    },
    "MAX232CPE": {
        "manufacturer": "Analog Devices",
        "description": "Dual RS-232 Driver/Receiver, +5V Supply",
        "category": "Interface - Drivers, Receivers, Transceivers",
        "stock": "7300",
        "price": "USD 4.98",
        "distributor": "MAX232CPE+-ND",
        "specs": {
            "Type": "Transceiver",
            "Protocol": "RS232",
            "Number of Drivers/Receivers": "2/2",
            "Duplex": "Full",
            "Receiver Hysteresis": "500mV",
            "Data Rate": "120 kb/s",
            "Voltage - Supply": "4.5V ~ 5.5V",
            "Operating Temperature": "0°C ~ 70°C",
            "Mounting Type": "Through Hole",
            "Package / Case": "16-DIP",
            "Supplier Device Package": "16-PDIP",
            "Lifecycle Status": "Not Recommended for New Designs",
        },
        "alternatives": [
            {
                "mpn": "MAX3232CPE+",
                "manufacturer": "Analog Devices",
                "description": "Dual RS-232 Transceiver, 3V to 5.5V Supply",
                "stock": "14600",
                "price": "USD 5.42",
                "distributor": "MAX3232CPE+-ND",
                "overrides": {
                    "Voltage - Supply": "3V ~ 5.5V",
                    "Data Rate": "250 kb/s",
                    "Lifecycle Status": "Active",
                },
            },
            {
                "mpn": "SP3232EEN-L/TR",
                "manufacturer": "MaxLinear",
                "description": "Dual RS-232 Transceiver, 3.3V, 235 kbps",
                "stock": "9250",
                "price": "USD 1.31",
                "distributor": "1811-SP3232EEN-L/TR-ND",
                "overrides": {
                    "Voltage - Supply": "3V ~ 5.5V",
                    "Data Rate": "235 kb/s",
                    "Mounting Type": "Surface Mount",
                    "Package / Case": "16-SOIC",
                    "Supplier Device Package": "16-SOIC (3.9mm)",
                    "Operating Temperature": "-40°C ~ 85°C",
                    "Lifecycle Status": "Active",
                },
            },
        ],
    },
    "PIC16F877A-I/P": {
        "manufacturer": "Microchip Technology",
        "description": "8-bit PIC Microcontroller, 14KB Flash, 40-Pin PDIP",
        "category": "Microcontrollers",
        "stock": "4120",
        "price": "USD 6.84",
        "distributor": "PIC16F877A-I/P-ND",
        "specs": {
            "Core Processor": "PIC",
            "Core Size": "8-Bit",
            "Speed": "20MHz",
            "Connectivity": "I2C, SPI, UART/USART",
            "Peripherals": "Brown-out Detect/Reset, POR, PWM, WDT",
            "Number of I/O": "33",
            "Program Memory Size": "14KB",
            "Program Memory Type": "FLASH",
            "RAM Size": "368 x 8",
            "EEPROM Size": "256 x 8",
            "Voltage - Supply (Vcc/Vdd)": "4V ~ 5.5V",
            "Data Converters": "A/D 8x10b",
            "Oscillator Type": "External",
            "Operating Temperature": "-40°C ~ 85°C (TA)",
            "Mounting Type": "Through Hole",
            "Package / Case": "40-DIP",
            "Supplier Device Package": "40-PDIP",
            "Lifecycle Status": "Active",
        },
        "alternatives": [
            {
                "mpn": "PIC18F4520-I/P",
                "manufacturer": "Microchip Technology",
                "description": "8-bit PIC Microcontroller, 32KB Flash, nanoWatt",
                "stock": "2870",
                "price": "USD 7.31",
                "distributor": "PIC18F4520-I/P-ND",
                "overrides": {
                    "Core Processor": "PIC",
                    "Speed": "40MHz",
                    "Program Memory Size": "32KB",
                    "RAM Size": "1.5K x 8",
                    "Voltage - Supply (Vcc/Vdd)": "2V ~ 5.5V",
                    "Data Converters": "A/D 13x10b",
                },
            },
            {
                "mpn": "ATMEGA32A-PU",
                "manufacturer": "Microchip Technology",
                "description": "8-bit AVR Microcontroller, 32KB Flash, 40-Pin PDIP",
                "stock": "6540",
                "price": "USD 5.02",
                "distributor": "ATMEGA32A-PU-ND",
                "overrides": {
                    "Core Processor": "AVR",
                    "Speed": "16MHz",
                    "Program Memory Size": "32KB",
                    "RAM Size": "2K x 8",
                    "EEPROM Size": "1K x 8",
                    "Number of I/O": "32",
                    "Voltage - Supply (Vcc/Vdd)": "2.7V ~ 5.5V",
                    "Data Converters": "A/D 8x10b",
                },
            },
        ],
    },
    "AT89C51-24PC": {
        "manufacturer": "Microchip Technology",
        "description": "8-bit 8051 Microcontroller, 4KB Flash, 24MHz",
        "category": "Microcontrollers",
        "stock": "0",
        "price": "Not Available",
        "distributor": "AT89C51-24PC-ND",
        "specs": {
            "Core Processor": "8051",
            "Core Size": "8-Bit",
            "Speed": "24MHz",
            "Connectivity": "UART/USART",
            "Peripherals": "POR, WDT",
            "Number of I/O": "32",
            "Program Memory Size": "4KB",
            "Program Memory Type": "FLASH",
            "RAM Size": "128 x 8",
            "Voltage - Supply (Vcc/Vdd)": "4.5V ~ 5.5V",
            "Oscillator Type": "External",
            "Operating Temperature": "0°C ~ 70°C (TA)",
            "Mounting Type": "Through Hole",
            "Package / Case": "40-DIP",
            "Supplier Device Package": "40-PDIP",
            "Lifecycle Status": "Obsolete",
        },
        "alternatives": [
            {
                "mpn": "AT89S52-24PU",
                "manufacturer": "Microchip Technology",
                "description": "8-bit 8051 Microcontroller, 8KB Flash, ISP",
                "stock": "3100",
                "price": "USD 4.16",
                "distributor": "AT89S52-24PU-ND",
                "overrides": {
                    "Program Memory Size": "8KB",
                    "RAM Size": "256 x 8",
                    "Peripherals": "POR, WDT, ISP",
                    "Lifecycle Status": "Active",
                },
            },
            {
                "mpn": "STC89C52RC-40I-PDIP40",
                "manufacturer": "STC Micro",
                "description": "8-bit 8051 Microcontroller, 8KB Flash, 40MHz",
                "stock": "18900",
                "price": "USD 1.08",
                "distributor": "STC89C52RC-ND",
                "overrides": {
                    "Speed": "40MHz",
                    "Program Memory Size": "8KB",
                    "RAM Size": "512 x 8",
                    "Operating Temperature": "-40°C ~ 85°C (TA)",
                    "Lifecycle Status": "Active",
                },
            },
        ],
    },
    "LM2596S-5.0": {
        "manufacturer": "Texas Instruments",
        "description": "3A Step-Down Voltage Regulator, 5V Fixed Output",
        "category": "DC-DC Switching Regulators",
        "stock": "11300",
        "price": "USD 4.27",
        "distributor": "LM2596S-5.0/NOPB-ND",
        "specs": {
            "Function": "Step-Down",
            "Output Configuration": "Positive",
            "Topology": "Buck",
            "Output Type": "Fixed",
            "Number of Outputs": "1",
            "Voltage - Output (Min/Fixed)": "5V",
            "Voltage - Input (Min)": "7V",
            "Voltage - Input (Max)": "40V",
            "Current - Output": "3A",
            "Frequency - Switching": "150kHz",
            "Synchronous Rectifier": "No",
            "Operating Temperature": "-40°C ~ 125°C (TJ)",
            "Mounting Type": "Surface Mount",
            "Package / Case": "TO-263-5",
            "Supplier Device Package": "TO-263-5 (D2PAK)",
            "Lifecycle Status": "Active",
        },
        "alternatives": [
            {
                "mpn": "LM2576S-5.0/NOPB",
                "manufacturer": "Texas Instruments",
                "description": "3A Step-Down Voltage Regulator, 52kHz",
                "stock": "5900",
                "price": "USD 5.14",
                "distributor": "LM2576S-5.0/NOPB-ND",
                "overrides": {"Frequency - Switching": "52kHz", "Package / Case": "TO-263-5"},
            },
            {
                "mpn": "MP2307DN-LF-Z",
                "manufacturer": "Monolithic Power Systems",
                "description": "3A Synchronous Step-Down Converter, 340kHz",
                "stock": "22800",
                "price": "USD 1.24",
                "distributor": "MP2307DN-LF-Z-ND",
                "overrides": {
                    "Output Type": "Adjustable",
                    "Voltage - Output (Min/Fixed)": "0.925V",
                    "Voltage - Input (Max)": "23V",
                    "Frequency - Switching": "340kHz",
                    "Synchronous Rectifier": "Yes",
                    "Package / Case": "8-SOIC",
                    "Supplier Device Package": "SOIC-8",
                },
            },
        ],
    },
    "ULN2003AN": {
        "manufacturer": "Texas Instruments",
        "description": "7-Channel Darlington Transistor Array, 500mA",
        "category": "Power Driver Modules",
        "stock": "33500",
        "price": "USD 0.92",
        "distributor": "ULN2003AN-ND",
        "specs": {
            "Type": "Darlington Array",
            "Number of Channels": "7",
            "Output Type": "Open Collector",
            "Current - Output (Max)": "500mA",
            "Voltage - Output (Max)": "50V",
            "Input Type": "TTL, 5V CMOS",
            "Internal Clamp Diode": "Yes",
            "Operating Temperature": "-40°C ~ 85°C (TA)",
            "Mounting Type": "Through Hole",
            "Package / Case": "16-DIP",
            "Supplier Device Package": "16-PDIP",
            "Lifecycle Status": "Active",
        },
        "alternatives": [
            {
                "mpn": "ULN2803A",
                "manufacturer": "Texas Instruments",
                "description": "8-Channel Darlington Transistor Array, 500mA",
                "stock": "27100",
                "price": "USD 1.16",
                "distributor": "ULN2803A-ND",
                "overrides": {"Number of Channels": "8", "Package / Case": "18-DIP",
                              "Supplier Device Package": "18-PDIP"},
            },
            {
                "mpn": "TBD62003APG",
                "manufacturer": "Toshiba Semiconductor",
                "description": "7-Channel DMOS Transistor Array, 500mA, Low Vol",
                "stock": "15600",
                "price": "USD 1.38",
                "distributor": "TBD62003APG-ND",
                "overrides": {
                    "Type": "DMOS Array",
                    "Output Type": "Open Drain",
                    "Operating Temperature": "-40°C ~ 85°C (TA)",
                },
            },
        ],
    },
    "TL074CN": {
        "manufacturer": "Texas Instruments",
        "description": "Quad JFET-Input General-Purpose Operational Amplifier",
        "category": "Linear - Amplifiers",
        "stock": "19400",
        "price": "USD 0.88",
        "distributor": "296-1774-5-ND",
        "specs": {
            "Amplifier Type": "General Purpose",
            "Number of Circuits": "4",
            "Output Type": "Standard",
            "Slew Rate": "13 V/µs",
            "Gain Bandwidth Product": "3MHz",
            "Current - Input Bias": "30pA",
            "Voltage - Input Offset": "3mV",
            "Current - Supply": "1.4mA",
            "Voltage - Supply Span (Min)": "7V",
            "Voltage - Supply Span (Max)": "36V",
            "Operating Temperature": "0°C ~ 70°C",
            "Mounting Type": "Through Hole",
            "Package / Case": "14-DIP",
            "Supplier Device Package": "14-PDIP",
            "Lifecycle Status": "Active",
        },
        "alternatives": [
            {
                "mpn": "TL084CN",
                "manufacturer": "Texas Instruments",
                "description": "Quad JFET-Input Operational Amplifier",
                "stock": "13800",
                "price": "USD 0.79",
                "distributor": "296-1780-5-ND",
                "overrides": {"Slew Rate": "13 V/µs", "Voltage - Input Offset": "5mV"},
            },
            {
                "mpn": "LF347N",
                "manufacturer": "Texas Instruments",
                "description": "Quad Wide-Bandwidth JFET-Input Operational Amplifier",
                "stock": "4300",
                "price": "USD 1.94",
                "distributor": "LF347N-ND",
                "overrides": {"Gain Bandwidth Product": "4MHz", "Voltage - Input Offset": "5mV"},
            },
        ],
    },
    "EE-SX4070": {
        "manufacturer": "Omron Electronics",
        "description": "Transmissive Photomicrosensor, Phototransistor Output",
        "category": "Optical Sensors - Photointerrupters",
        "stock": "1850",
        "price": "USD 7.62",
        "distributor": "EE-SX4070-ND",
        "specs": {
            "Sensing Method": "Transmissive",
            "Output Configuration": "Phototransistor",
            "Slot Width": "3.6mm",
            "Voltage - Supply": "5V ~ 24V",
            "Current - Forward (If) (Max)": "50mA",
            "Voltage - Forward (Vf) (Typ)": "1.2V",
            "Current - Dark (Id) (Max)": "10nA",
            "Response Time": "20µs",
            "Operating Temperature": "-25°C ~ 85°C",
            "Mounting Type": "Through Hole",
            "Package / Case": "Slot Type, Side View",
            "Lifecycle Status": "Not Recommended for New Designs",
        },
        "alternatives": [
            {
                "mpn": "EE-SX1070",
                "manufacturer": "Omron Electronics",
                "description": "Transmissive Photomicrosensor, Side View, 3.6mm Slot",
                "stock": "980",
                "price": "USD 8.11",
                "distributor": "EE-SX1070-ND",
                "overrides": {"Response Time": "20µs", "Lifecycle Status": "Active"},
            },
            {
                "mpn": "GP1A57HRJ00F",
                "manufacturer": "Sharp Microelectronics",
                "description": "Transmissive Photointerrupter, Phototransistor Output",
                "stock": "3400",
                "price": "USD 3.05",
                "distributor": "GP1A57HRJ00F-ND",
                "overrides": {
                    "Slot Width": "3mm",
                    "Voltage - Supply": "5V",
                    "Response Time": "30µs",
                    "Operating Temperature": "-25°C ~ 85°C",
                    "Lifecycle Status": "Active",
                },
            },
        ],
    },
}


# --------------------------------------------------------------------------
# Lookup
# --------------------------------------------------------------------------

def _normalise(value: str) -> str:
    """Fold a part number to its comparable core: upper case, no separators."""
    return "".join(ch for ch in str(value).upper() if ch.isalnum())


def find_key(part_number: str) -> Optional[str]:
    """Best catalogue key for a part number, or None.

    Matching is deliberately forgiving — engineers type `LM317`, `lm317t` and
    `LM317T/NOPB` for the same device, and a demo that only answers the exact
    string is a demo that looks broken.
    """
    if not part_number:
        return None
    needle = _normalise(part_number)
    if not needle:
        return None

    keys = list(CATALOGUE)

    for key in keys:                                    # exact
        if _normalise(key) == needle:
            return key
    for key in keys:                                    # catalogue key contains query
        if needle in _normalise(key):
            return key
    for key in keys:                                    # query contains catalogue key
        if _normalise(key) in needle:
            return key

    # Fall back to the family stem: LM317 matches LM317T, STM32F103 matches
    # STM32F103C8T6. Longest sensible prefix wins.
    for length in range(len(needle), 3, -1):
        stem = needle[:length]
        for key in keys:
            if _normalise(key).startswith(stem):
                return key
    return None


def _entry_specs(entry: Dict, alternative: Optional[Dict] = None) -> Dict[str, str]:
    specs = dict(entry["specs"])
    if alternative:
        specs.update(alternative.get("overrides", {}))
    return specs


def _rows(part_number: str):
    """(mpn, manufacturer, description, category, specs, stock, price, dk) tuples."""
    key = find_key(part_number)
    if not key:
        return []
    entry = CATALOGUE[key]

    rows = [(
        key,
        entry["manufacturer"],
        entry["description"],
        entry["category"],
        _entry_specs(entry),
        entry.get("stock", "0"),
        entry.get("price", "Not Available"),
        entry.get("distributor", "Not Available"),
    )]
    for alt in entry.get("alternatives", []):
        rows.append((
            alt["mpn"],
            alt["manufacturer"],
            alt.get("description", entry["description"]),
            entry["category"],
            _entry_specs(entry, alt),
            alt.get("stock", "0"),
            alt.get("price", "Not Available"),
            alt.get("distributor", "Not Available"),
        ))
    return rows


def resolve(part_number: str, limit: int = 5) -> List[Dict]:
    """Octopart `search_similar_parts` shape: flat spec keys."""
    out = []
    for mpn, mfr, desc, cat, specs, _stock, _price, _dk in _rows(part_number)[:limit]:
        row = {
            "ManufacturerPartNumber": mpn,
            "Manufacturer": mfr,
            "Description": desc,
            "Category": cat,
        }
        row.update(specs)
        out.append(row)
    return out


def resolve_merged(part_number: str, limit: int = 5) -> List[Dict]:
    """`search_component_3api` shape: SPEC_-prefixed keys plus Mouser columns."""
    out = []
    for mpn, mfr, desc, cat, specs, stock, price, dk in _rows(part_number)[:limit]:
        row = {
            "MPN": mpn,
            "Manufacturer": mfr,
            "Description": desc,
            "Category": cat,
            "Mouser_PartNumber": f"{mpn}",
            "Mouser_Stock": stock,
            "Mouser_Availability": "In Stock" if stock not in ("0", "", None) else "Non-Stocked",
            "Mouser_LeadTime": "12 Weeks" if stock in ("0", "", None) else "2 Weeks",
            "Mouser_Price_Qty1": price,
            "DigiKeyPartNumber": dk,
        }
        for parameter, value in specs.items():
            row[f"SPEC_{parameter}"] = value
        out.append(row)
    return out


def is_available(part_number: str) -> bool:
    return find_key(part_number) is not None


#: Every head part, for the seeder and for the UI's quick-scenario chips.
PART_NUMBERS = list(CATALOGUE)
