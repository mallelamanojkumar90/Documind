/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chunks from "../chunks.js";
import type * as conversations from "../conversations.js";
import type * as documents from "../documents.js";
import type * as ingest from "../ingest.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_chunker from "../lib/chunker.js";
import type * as lib_groq from "../lib/groq.js";
import type * as messages from "../messages.js";
import type * as messagesNode from "../messagesNode.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chunks: typeof chunks;
  conversations: typeof conversations;
  documents: typeof documents;
  ingest: typeof ingest;
  "lib/ai": typeof lib_ai;
  "lib/chunker": typeof lib_chunker;
  "lib/groq": typeof lib_groq;
  messages: typeof messages;
  messagesNode: typeof messagesNode;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
