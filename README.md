<img src="https://deepnest.io/img/logo-large.png" alt="Deepnest" width="250">

## **Deepnest**

A fast nesting tool for laser cutters and other CNC tools

Deepnest is a desktop application originally based on [SVGNest](https://github.com/Jack000/SVGnest)

- New nesting engine with speed critical code written in C
- Merges common lines for laser cuts
- Support for DXF files (via conversion)
- New path approximation feature for highly complex parts

## Fork History

* https://github.com/Jack000/SVGnest (Academic Work References)
* https://github.com/Jack000/Deepnest
  * https://github.com/Dogthemachine/Deepnest
    * https://github.com/cmidgley/Deepnest
      * https://github.com/deepnest-io/Deepnest


## Support, issues and pull requests

The primary goal has been to get Deepnest buildable again, to prevent it to become abandonware as the original author does not seem to be activley involved. The goal of creating the fork under this organization is to create again a centralized repo where development of this program can continue. 
It would be wonderful if more contributors join this organization so we can bring
this project back to life, update it with latest dependencies and start adding features / fixing
issues.


## Prerequisites

- **Node 14/16/18/20:** [Node.js](https://nodejs.org). You can use the Node Version Manager (nvm):
  -  [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) to download Node and change versions.
- **Python 3.7.9** You can use the Python Version Manager (pyenv):
  - [pyenv-win](https://github.com/pyenv-win/pyenv-win) to download and change versions.
- **Visual Studio with Desktop Development with C++ extension**
  - Install VS2022 from https://visualstudio.microsoft.com/vs/features/cplusplus/
  - or, as an administrator via `npm install --global windows-build-tools` (older VS version)


### Possible Problems

* On Windows 10 1905 or newer, you might need to **disable the built-in Python launcher** via
  - **Start** > "**Manage App Execution Aliases**" and turning off the "**App Installer" aliases   for Python**"
* close-and-open all command shells and your IDE to activate the latest setup


## Building

```sh
git clone --recurse-submodules --remote-submodules https://github.com/deepnest-io/Deepnest
cd Deepnest
npm install
npm run build
npm run start
```

### Rebuild

```sh
# If you change the electron-related files (web files, javascript), a build with 
npm run build

# If you change the the Minkowski files (the `.cc` or `.h` files):
npm run build-all
```

### Running

- `npm run start`

### Clean builds

```sh

npm run clean  && npm run build

# full clean, incl. `node_modules`
npm run clean-all && npm install && npm run build
```

### Create a Distribution

```sh
npm run dist

# During development, you can combine `clean-all, build-all and dist` via:
npm run dist-all
```

The resulting files will be located in `.\deepnest-<version>-win32-x64`.

Create a zip file of this folder for a simple distribution.

## Debugging

If the environment variable "deepnest_debug" has a value of "1", Deepnest will open the browser dev tools (debugger/inspector).

### Debugging on VSCode?

Set your `package.json` like below

```json
  ...
  "scripts": {
    "start": "electron --inspect=9223",
    ...
```

Set your `.vscode/launch.json` like below

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Electron: Main",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
            "runtimeArgs": [
                "--remote-debugging-port=9223",
                "."
            ],
            "windows": {
                "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
            }
        },
        {
            "name": "Electron: Renderer",
            "type": "chrome",
            "request": "attach",
            "port": 9223,
            "webRoot": "${workspaceFolder}",
            "timeout": 30000
        }
    ],
    "compounds": [
        {
            "name": "Electron: All",
            "configurations": [
                "Electron: Main",
                "Electron: Renderer"
            ]
        }
    ]
}
```
## License

The main license is the MIT.

* [LICENSE](LICENSE)

Further Licenses:

* [LICENSES](LICENSES.md)
