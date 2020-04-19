import * as vscode from "vscode";
import { RedisGearsExplorer } from "./RedisGearsExplorer";

export function activate(context: vscode.ExtensionContext) {
  new RedisGearsExplorer(context);
}
