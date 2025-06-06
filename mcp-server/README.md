# DWB Trello MCP Server

Custom Model Context Protocol (MCP) server for enhanced Trello integration with client onboarding workflows.

## Features

- **Board Creation**: Automatically create Trello boards with client onboarding templates
- **Member Management**: Add team members and clients to boards with appropriate roles
- **List Management**: Pre-configured lists for client project workflows
- **Legacy Compatibility**: Supports existing Trello MCP tools for backward compatibility

## Tools

### Core Tools

- `create_board` - Create a new board with default client onboarding lists
- `get_boards` - Retrieve boards, optionally filtered by organization
- `add_member_to_board` - Add members to boards with specified roles

### Legacy Tools

- `add_card_to_list` - Add cards to existing lists
- `get_lists` - Get lists from a board

## Environment Variables

```bash
TRELLO_API_KEY=your_trello_api_key
TRELLO_TOKEN=your_trello_token
```

## Installation

```bash
npm install
```

## Usage

### Development
```bash
node index.js
```

### Production (Fly.io)
```bash
fly deploy
```

## Board Template

When creating a board, the following lists are automatically created:

1. **Welcome & Setup** - Initial client onboarding
2. **Requirements Gathering** - Collect project requirements
3. **Design Brief** - Design specifications and assets
4. **In Progress** - Active development tasks
5. **Client Review** - Items pending client feedback
6. **Completed** - Finished deliverables

## API Response Format

All tools return JSON responses with structured data:

```json
{
  "board": {
    "id": "board_id",
    "name": "Board Name",
    "url": "https://trello.com/b/..."
  },
  "lists": {
    "welcome_setup": "list_id_1",
    "requirements_gathering": "list_id_2",
    "design_brief": "list_id_3",
    "in_progress": "list_id_4",
    "client_review": "list_id_5",
    "completed": "list_id_6"
  }
}
```

## Health Check

The server includes a health check endpoint for deployment monitoring:

```bash
node index.js --health
```

## Deployment

This server is designed to be deployed on Fly.io with the included configuration files:

- `fly.toml` - Fly.io app configuration
- `Dockerfile` - Container build instructions

## License

MIT License - See LICENSE file for details.