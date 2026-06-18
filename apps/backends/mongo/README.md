install express cors dotenv mongoose zod morgan
npm i express cors dotenv mongoose zod morgan

install types
npm i -D typescript tsx @types/node @types/cors @types/morgan

add this to tsconfig.json

{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    "rootDir": "src",
    "outDir": "dist",

    "strict": true,
    "skipLibCheck": true,

    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "types" : ["node"]
  },
  "include": ["src"]
}

add this to scripts:
 "dev": "tsx watch src/index.ts", 
    "build": "tsc",
    "start": "node dist/index.js"

change "main" : "src/index.ts"



draw the folder structure
src/
    config/
        db.ts
    constants/
        env.ts
        https.ts

