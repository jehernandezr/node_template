{
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "name": "__name__",
  "sourceRoot": "backend/apps/__name__/src",
  "projectType": "application",
  "tags": ["type:app", "scope:__name__"],
  "targets": {
    "typecheck": {},
    "build": {
      "options": {
        "command": "tsx backend/tools/app-bundler/src/main.ts {projectName} {projectRoot} --entry=src/worker.ts --entry=src/migrate.ts --entry=src/lambda.ts"
      }
    },
    "serve": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "node --env-file-if-exists=backend/.env backend/dist/__name__/main.mjs",
        "cwd": "{workspaceRoot}"
      }
    },
    "worker": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "node --env-file-if-exists=backend/.env backend/dist/__name__/worker.mjs",
        "cwd": "{workspaceRoot}"
      }
    },
    "migrate": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "node --env-file-if-exists=backend/.env backend/dist/__name__/migrate.mjs {args.target}",
        "cwd": "{workspaceRoot}"
      }
    },
    "test": {
      "options": {
        "passWithNoTests": true
      }
    }
  }
}
