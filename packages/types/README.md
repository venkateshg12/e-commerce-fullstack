run the commmands:
- npm init -y
- npx tsc --init

paste the ui's folder tsconfig.json to the types tsconfig.json 
change the "extends" : "@repo/typescript-config/base.json";

now add the dependency to follownig folder packages where the types being used 
{
  "dependencies": {
    "@repo/types": "*"
  }
}

change this in package.json
 "main": "./src/index.ts",
  "types": "./src/index.ts",
  "name" : "@repo/types"