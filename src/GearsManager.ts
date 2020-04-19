import * as vscode from 'vscode';
import * as fs from 'fs';
import Redis from 'ioredis';
import {GearsTypes} from './GearsTypes';

export class GearsManager {
    private redisClient: any = undefined;

    constructor() {}

    /**
     * Connect to Redis to manipulate Gears
     * 
     * @param url connection string
     */
    connect(url: string): void {
      if (url && url.length != 0) {
        this.redisClient = new Redis(url, {
          retryStrategy: (): any => {
            vscode.window.showErrorMessage( `Error: Cannot connect to Redis: review the Gears configuration`);
            return new Error("Retry time exhausted");
          },
          maxRetriesPerRequest: 1
        });
    
        this.redisClient.on("error", (error: any) => {
          vscode.window.showErrorMessage( `Error: Cannot connect to Redis: ${error}`);
          console.log(error);
        });
      } else {
        // Do not automaticallu connect to Redis
        console.log("Configuration is null, run the command 'Connect to Redis'");
      } 
    }
    
    /**
     * Disconnecto from Redis
     */
    disconnect(): void {
      if (this.redisClient) {
        this.redisClient.disconnect();
      }
    }
    
    /**
     * Check if connected to Redis
     */
    get isConnected(): Boolean {
      return  (this.redisClient && this.redisClient.status);
    }    

    /**
     * Get the list of registered gears in the current database
     * 
     * This method is calling a Python script, that you can see at the bottom
     * 
     */
    async getRegisteredGears(): Promise< any[]> {
      if (!this.isConnected) return Promise.reject();
      return new Promise<string[]>((resolve, reject) => {
        this.redisClient.send_command(
          'RG.PYEXECUTE', 
          [this.script],
          (error:any, result:[]) => {
            if (error) {
              vscode.window.showErrorMessage(`Error: Cannot retrieve the list of Gears : ${error}`);
              console.log(error);
              reject();
            }    
            let retVal:any[] = [];
            for (let entry of result) {
              if (entry.length != 0) {
                for (let entry2 of entry) {
                  let o = JSON.parse(entry2);
                  retVal.push(                  {
                    key : o.reader +":"+ o.id.split("-")[1],
                    id : o.id,
                    type: GearsTypes.ItemType
                  });

                }
              }
            }
            resolve(retVal);
            
          }

        ).catch(() => {
          return [];
        });


      }).catch(() => {
        return [];
      });
    }


    /**
     * Register current open file into Regis Gears
     * 
     * TODO: manage exceptions, find a way to rewrite an existing one
     * 
     * @param filename 
     */
    async registerGearsFromFile(filename: string|undefined): Promise< string > {
      if (!this.isConnected) return Promise.reject();
      return new Promise<string>((resolve, reject) => {
        try {
          if (filename) {
              let fileContent = fs.readFileSync(filename , "utf8");
              this.redisClient.send_command(
                  'RG.PYEXECUTE', 
                  [fileContent], (error:any, result:any) => {
                    if (error) {
                      console.log(error);
                      vscode.window.showErrorMessage(`Error Registering Gears ${error}`); 
                      reject(`Error Registering Gears ${error}`);
                    } else {
                      vscode.window.showInformationMessage('Your Redis Gear is registered!'); 
                      resolve();
                    }                        
                  }).catch( (err:any) => {
                    vscode.window.showErrorMessage(`Error Registering Gears ${err}`); 
                    console.log(err);
                    reject(err);
                  })
            }
          } catch(err) {
            vscode.window.showErrorMessage(`Error Registering Gears ${err}`); 
            console.log(err);
          }
      });
    }


    /**
     * unregister the deployed gear
     * @param id the id of the Gear
     */
    public unregisterGear(id: string) {
      this.redisClient.send_command('RG.UNREGISTER', [id])
              .then(function(result:any){
                console.log(`Gear ${id} deleted (${result})`);
              })
              .catch(function(err:any){
                console.log(`Error Deleting Gear ${id} : ${err}`);
              })
    }


    async getModuleInfo(): Promise<string> {
      if (!this.isConnected) return Promise.reject();

      return new Promise<string>((resolve:any, reject:any) => {
        this.redisClient.send_command('MODULE', ['LIST'],
          (error:any, result:any)=>{
            if (error) {
              console.log("Error");
              reject("");
            } else {
              let isGearInstalled = false;
              for (const it of result) {
                if ( it[1] == "rg" ) {
                  isGearInstalled = true;
                  resolve(`(v${it[3]})`);
                }
              }
              if (!isGearInstalled) {
                resolve("(No gear)");

              }
            }
          })
        .catch(() => {return ""; });
      });
    }


// Gears to get gears info
script ="import json\n\
\n\
def RegistrationArrToDict(registration, depth=0):\n\
    if depth >= 3:\n\
        return registration\n\
    if type(registration) is not list:\n\
        return registration\n\
    d = {}\n\
    for i in range(0, len(registration), 2):\n\
        d[registration[i]] = RegistrationArrToDict(registration[i + 1], depth + 1)\n\
    return d\n\
\n\
\n\
def AggregateRes(k, a, r):\n\
  r = RegistrationArrToDict(r)\n\
  if a == {}:\n\
    lastError = r['RegistrationData']['lastError']\n\
    r['RegistrationData']['lastError'] = []\n\
    r['NumShards']=1\n\
    if lastError != [None] and lastError != None:\n\
      if isinstance(lastError, list):\n\
        r['RegistrationData']['lastError'] += lastError\n\
      else:\n\
        r['RegistrationData']['lastError'] += [lastError]\n\
    return r\n\
  a['NumShards']+=1\n\
  a['RegistrationData']['numTriggered'] += r['RegistrationData']['numTriggered']\n\
  a['RegistrationData']['numSuccess'] += r['RegistrationData']['numSuccess']\n\
  a['RegistrationData']['numFailures'] += r['RegistrationData']['numFailures']\n\
  a['RegistrationData']['numAborted'] += r['RegistrationData']['numAborted']\n\
  if r['RegistrationData']['lastError'] != [None] and r['RegistrationData']['lastError'] != None:\n\
    if isinstance(r['RegistrationData']['lastError'], list):\n\
      a['RegistrationData']['lastError'] += r['RegistrationData']['lastError']\n\
    else:\n\
      a['RegistrationData']['lastError'] += [r['RegistrationData']['lastError']]\n\
  return a\n\
\n\
\n\
def CheckNumShardSanity(r):\n\
  numShards = execute('RG.INFOCLUSTER')\n\
  if numShards == 'no cluster mode':\n\
    return\n\
  numShards = len(numShards[2])\n\
  if r['NumShards'] != numShards:\n\
    r['RegistrationData']['lastError'] += ['Warning: not all shards contains the registration.']\n\
\n\
\n\
\n\
GB('ShardsIDReader')\\\n\
.flatmap(lambda x: execute('RG.DUMPREGISTRATIONS'))\\\n\
.aggregateby(lambda x: x[1], {}, AggregateRes, AggregateRes)\\\n\
.map(lambda x: x['value'])\\\n\
.foreach(CheckNumShardSanity)\\\n\
.map(lambda x: json.dumps(x)).run()\n";

}