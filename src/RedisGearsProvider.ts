import * as vscode from "vscode";
import {GearsManager} from "./GearsManager";
import * as path from "path";
import {GearsTypes} from './GearsTypes';



export class RedisGearsProvider implements vscode.TreeDataProvider<GearsTypes.EntryGear> {
  private gearsManager: any | undefined = undefined;
  private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

  constructor() {
    this.gearsManager = new GearsManager();
    this.connectRedis();
  }

  public refresh() {
    this.connectRedis();
    this._onDidChangeTreeData.fire();
  }

  async connectRedis() {
    const configuration = vscode.workspace.getConfiguration();
    if (configuration.redisGears) {
      this.gearsManager.connect( configuration.redisGears.url );
    } else {
      console.log("Redis Gears: no connection string ");
      console.log(configuration)
    }
  }

  disconnectRedis() {
    this.gearsManager.disconnect();
  }

  async getTreeItem(element: GearsTypes.EntryGear): Promise<vscode.TreeItem> {
    if (!this.gearsManager) {
      return Promise.reject();
    }

    let treeItem = new vscode.TreeItem(
      element.key,
      element.type === GearsTypes.ItemType.Server
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );


    treeItem.iconPath = {
      light: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "light",
        element.type === GearsTypes.ItemType.Server
          ? "redis-logo.png"
          : "gears.png"
      ),
      dark: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "dark",
        element.type === GearsTypes.ItemType.Server
          ? "redis-logo.png"
          : "gears.png"
      )
    };


    if (element.type !== GearsTypes.ItemType.Server) {
      treeItem.contextValue = "redisNode";
    }
    return treeItem;
  }

  /**
   * Navigate the tree entries
   * @param element 
   */
  async getChildren(element: GearsTypes.EntryGear | undefined): Promise<GearsTypes.EntryGear[]> {
    if (!element) {
      const configuration = vscode.workspace.getConfiguration();
      let version = await this.gearsManager.getModuleInfo()
      return [{ key:  configuration.redisGears.url +" "+ version , type: GearsTypes.ItemType.Server }];
    } else if (element.type === GearsTypes.ItemType.Server) {
      try {
        const result = await this.gearsManager.getRegisteredGears();
        return result;      
      } catch (e) {
        return [];
      }
    }

    return [];
  }


  /**
   * 
   * @param fileName Send the path to the current file that mue be registered
   */
  registerGear(fileName: string){
    this.gearsManager.registerGearsFromFile(fileName);
  }

  /**
   * Call Redis Gear module to remove the registered Gears
   * @param gear 
   */
  unregisterGear(gear: GearsTypes.EntryGear){
    this.gearsManager.unregisterGear(gear.id);
  }

}
