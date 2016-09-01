## Quickstart-cli

A command line tool for creating initial files to quickstart Angular2 projects

## Prerequisites
The generated project has dependencies that require **Node 4.x.x and NPM 3.x.x**.
## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)
```bash
npm install -g git+https://github.com/shiftescape/QuickStart-CLI.git
```

## Usage

```bash
qs --help
```

### Generating and serving an Angular2 project
```bash
qs --new PROJECT_NAME
cd PROJECT_NAME
npm start
```
Navigate to `http://localhost:3000/`. The app will automatically reload if you change any of the source files.

## Generating Components, Directives, Pipes and Services

You can use the `qs --generate` (or just `qs -g`) command to generate Angular components:

```bash
qs --generate component my-new-component
qs -g component my-new-component # using the alias

# components support relative path generation
# if in the directory src/app/feature/ and you run
qs -g component new-cmp
# your component will be generated in src/app/feature/new-cmp
# but if you were to run
qs -g component ../newer-cmp
# your component will be generated in src/app/newer-cmp
```
You can find all possible blueprints in the table below:

Scaffold  | Usage
---       | ---
Component | `qs -g component my-new-component`
Directive | `qs -g directive my-new-directive`
Pipe      | `qs -g pipe my-new-pipe`
Service   | `qs -g service my-new-service`
