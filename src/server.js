#!/usr/bin/env node

import { readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_NVIDIA_MODEL = "meta/llama-4-maverick-17b-128e-instruct";

const server = new McpServer({
  name: "nvidia-vision",
  version: "0.1.0",
});

function getApiKey() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not set. Add it to your MCP server environment.");
  }
  return apiKey;
}

function getModel() {
  return process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;
}

function getMimeType(filePath) {
  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
  };

  return mimeTypes[extname(filePath).toLowerCase()] ?? "image/png";
}

async function callVision(prompt, imagePath) {
  const fullPath = resolve(imagePath);

  if (!existsSync(fullPath)) {
    return `Error: file not found: ${imagePath}`;
  }

  const image = await readFile(fullPath);
  const mimeType = getMimeType(fullPath);
  const base64Image = image.toString("base64");

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NVIDIA API request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "No response returned from NVIDIA API.";
}

async function removeFile(filePath) {
  const fullPath = resolve(filePath);

  if (!existsSync(fullPath)) {
    return `File not found: ${filePath}`;
  }

  try {
    await unlink(fullPath);
    return `Deleted: ${filePath}`;
  } catch (error) {
    return `Failed to delete ${filePath}: ${error.message}`;
  }
}

function textResponse(text) {
  return {
    content: [{ type: "text", text }],
  };
}

server.tool(
  "describe_image",
  "Describe a local image in detail. Useful when the current AI model cannot see screenshots directly.",
  {
    image_path: z.string().describe("Absolute or relative path to the image file."),
    cleanup: z.boolean().default(false).describe("Delete the image file after reading it."),
  },
  async ({ image_path, cleanup }) => {
    let result = await callVision(
      "Describe this image in detail. Include visible elements, text, colors, layout, and anything unusual.",
      image_path,
    );

    if (cleanup) {
      result += `\n\n${await removeFile(image_path)}`;
    }

    return textResponse(result);
  },
);

server.tool(
  "extract_text_from_image",
  "Extract visible text from a local image or screenshot.",
  {
    image_path: z.string().describe("Absolute or relative path to the image file."),
    cleanup: z.boolean().default(false).describe("Delete the image file after reading it."),
  },
  async ({ image_path, cleanup }) => {
    let result = await callVision(
      "Extract all visible text from this image. Preserve line breaks and structure where possible. If there is no text, say that no text was found.",
      image_path,
    );

    if (cleanup) {
      result += `\n\n${await removeFile(image_path)}`;
    }

    return textResponse(result);
  },
);

server.tool(
  "analyze_image",
  "Ask a specific question about a local image.",
  {
    image_path: z.string().describe("Absolute or relative path to the image file."),
    question: z.string().describe("Question to answer using the image."),
    cleanup: z.boolean().default(false).describe("Delete the image file after reading it."),
  },
  async ({ image_path, question, cleanup }) => {
    let result = await callVision(question, image_path);

    if (cleanup) {
      result += `\n\n${await removeFile(image_path)}`;
    }

    return textResponse(result);
  },
);

server.tool(
  "delete_file",
  "Delete a local file, usually a temporary screenshot that is no longer needed.",
  {
    file_path: z.string().describe("Path to the file to delete."),
  },
  async ({ file_path }) => textResponse(await removeFile(file_path)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
