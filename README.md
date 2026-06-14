# NVIDIA Vision MCP

A small MCP server for reading local images with NVIDIA vision models.

This is useful when the AI model you are using cannot see images directly. A common case is browser debugging: Chrome DevTools can capture a screenshot, but the model still cannot inspect what is inside the image. This server gives the model a simple way to read that screenshot.

## What It Does

- Describes local images and screenshots
- Extracts visible text from images
- Answers specific questions about an image
- Deletes temporary screenshot files after use

## Setup

Add the server to your MCP client config:

```json
{
  "mcpServers": {
    "nvidia-vision": {
      "command": "npx",
      "args": ["-y", "nvidia-vision-mcp"],
      "env": {
        "NVIDIA_MODEL": "meta/llama-4-maverick-17b-128e-instruct",
        "NVIDIA_API_KEY": "your_nvidia_api_key"
      }
    }
  }
}
```

The API key is read from the MCP server environment. No `.env` file is needed.

`NVIDIA_MODEL` is optional. If it is not set, the server uses:

```text
meta/llama-4-maverick-17b-128e-instruct
```

You can replace it with another NVIDIA-hosted vision-capable chat model when needed.

For local development from this folder:

```json
{
  "mcpServers": {
    "nvidia-vision": {
      "command": "node",
      "args": ["/path/to/nvidia-vision/src/server.js"],
      "env": {
        "NVIDIA_MODEL": "meta/llama-4-maverick-17b-128e-instruct",
        "NVIDIA_API_KEY": "your_nvidia_api_key"
      }
    }
  }
}
```

## Tools

`describe_image`

Describes what is visible in a local image.

`extract_text_from_image`

Extracts text from an image or screenshot. Useful for UI errors, terminal output, form labels, dialogs, and short documents.

`analyze_image`

Answers a custom question about an image. For example, you can ask where a button is, what color an element uses, or whether an error message is visible.

`delete_file`

Deletes a local file. This is mostly for cleaning up temporary screenshots.

## Examples

Read text from a screenshot:

```text
extract_text_from_image(image_path="/tmp/screenshot.png")
```

Ask about a specific part of the UI:

```text
analyze_image(
  image_path="/tmp/screenshot.png",
  question="What does the primary button say, and where is it located?"
)
```

Describe a screenshot and remove it afterwards:

```text
describe_image(image_path="/tmp/screenshot.png", cleanup=true)
```

## Notes

This server intentionally stays narrow. It exists to help models inspect local screenshots when another tool can produce the image file but cannot explain what is inside it.
