# Component Guidelines

This document defines the standards for building and using TendWorks components.

## 1. Actions

### Button
Buttons are used to trigger actions.

| Prop | Type | Description |
| :--- | :--- | :--- |
| `variant` | `primary | secondary | ghost` | Visual style |
| `size` | `sm | md | lg` | Component size |

**Do's**:
*   Use a primary button for the main action on a page.
*   Use ghost buttons for less important actions or inside headers/tables.

**Don'ts**:
*   Don't use more than one primary button in a single view.

---

## 2. Forms

### Input
Standard text input for user data.

| Prop | Type | Description |
| :--- | :--- | :--- |
| `label` | `string` | Floating or top-aligned label |
| `error` | `string` | Error message to display below |
| `icon` | `ReactNode` | Optional prefix icon |

---

## 3. Data Display

### Card
Containers for grouping related information.

**Guidelines**:
*   Use cards to separate distinct sections of content.
*   Cards should have a default padding of `--space-6` (24px).
*   Hover effects should only be applied if the whole card is interactive.

---

## 4. Feedback

### Alert
Communicates important messages or status changes.

*   **Success**: Positive outcomes.
*   **Warning**: Potential issues that need attention.
*   **Error**: Critical failures.
*   **Info**: General information.
