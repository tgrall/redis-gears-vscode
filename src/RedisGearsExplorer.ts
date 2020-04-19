import * as vscode from "vscode";
import fs = require("fs");
import { RedisGearsProvider } from "./RedisGearsProvider";
import {GearsTypes} from './GearsTypes';

export class RedisGearsExplorer {
  gearsExplorer: vscode.TreeView<GearsTypes.EntryGear>;
  treeDataProvider: RedisGearsProvider;

  constructor(context: vscode.ExtensionContext) {
    this.treeDataProvider = new RedisGearsProvider();
    this.gearsExplorer = vscode.window.createTreeView("redisGearsExplorer", {treeDataProvider: this.treeDataProvider });



    // Register command that registers Gears from file
    vscode.commands.registerCommand('config.commands.redisGears.gearsRegistration', () => {
      let currentFileName = vscode.window.activeTextEditor?.document.fileName;
      if (currentFileName) {
        this.treeDataProvider.registerGear(currentFileName);
        this.treeDataProvider.refresh(); 
      } else {
        vscode.window.showErrorMessage('Error: You must open a Gear Source file');  
      }
    });

    // Register the command that add Redis Server URI into the configuration, and reconnect
    vscode.commands.registerCommand("config.commands.redisGears.connectRedisServer", async () => {
      const configuration = vscode.workspace.getConfiguration();
      const url = await vscode.window.showInputBox({
        prompt: "Gears: Enter Redis URL ",
        value: configuration.redisGears.url||undefined
      });

      if (url === "") {
        vscode.window.showInformationMessage( "Enter Redis URL "
        );
        return;
      }

      await vscode.workspace
        .getConfiguration()
        .update(
          "redisGears.url",
          url,
          vscode.ConfigurationTarget.Global
        );

      this.reconnectRedis();
    });

    vscode.workspace.onDidChangeConfiguration(event => {
      this.reconnectRedis();
    });


    // Refresh the Gears tressview
    vscode.commands.registerCommand("config.commands.redisGears.refresh", () => {
        this.reconnectRedis();
      },
      this // To use parameter in callback function, you must pass 'this'
    );

    vscode.commands.registerCommand("config.commands.redisGears.unregister", (node: GearsTypes.EntryGear) => {
        if (node) {
          this.treeDataProvider.unregisterGear(node);
          this.treeDataProvider.refresh();
        }
      },
      this // To use parameter in callback function, you must pass 'this'
    );


  }

  private reconnectRedis() {
    this.treeDataProvider.disconnectRedis();
    this.treeDataProvider.connectRedis();
    this.treeDataProvider.refresh();
  }


  
}

