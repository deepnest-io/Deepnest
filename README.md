<img src="https://deepnest.io/img/logo-large.png" alt="Deepnest" width="250">

**Deepnest**: A fast, robust nesting tool for laser cutters and other CNC tools

**Download:** https://deepnest.io

Deepnest is a desktop application based on [SVGNest](https://github.com/Jack000/SVGnest)

- new nesting engine with speed critical code written in C
- merges common lines for laser cuts
- support for DXF files (via conversion)
- new path approximation feature for highly complex parts


## About this fork

This is a fork of [Dogthemachine's fork](https://github.com/Dogthemachine/Deepnest) of [Jack000's
Deepnest](https://github.com/Jack000/Deepnest), with changes made to the make it able to be built
again (only Windows has been updated).

No attempts have been made to upgrade to the latest versions, and as such this software depends on
old packages.  You must pay close attention to the [prerequisites](#prerequisites) to get a
successful build.  The only "change" was to clone the `plus.svg` file into `add_sheet.svg` so a
reasonable add-sheet icon appears in the UI.

## Support, issues and pull requests

My goal has been to get Deepnest buildable again, nothing more. I'm not in a position to support
this fork (I don't know the code and don't have the time), so do not expect any assistance on
improvements or solving problems!  It would be wonderful if somebody (or a team) wanted
to bring this project back to life, update it with latest dependencies and start adding features /
fixing issues.  This fork may be a starting point, or at least perhaps provide guidance on building.
Good luck!

### Prerequisites

- You must have Visual Studio with C++ extensions installed.  
- Clone this fork with: `git clone --recurse-submodules --remote-submodules
  https://github.com/cmidgley/Deepnest`
- Download [Boost 1.62.0](https://sourceforge.net/projects/boost/files/boost/1.62.0/) and install it
 in `C:\local\boost_1_62_0`.  Verify that it is copied correctly by checking that the directory
 `C:\local\boost_1_62_0\boost` exists.
- Use [Node.js](https://nodejs.org) version 8 (10 generates lots of warnings, and 12+ fails due to node-gyp).  Recommend using the Node version manager.
  [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) to download Node and change
  versions.
- Ensure you are on Python 2.7 (Python 3 does not work).  Recommend using Python version manager
  [pyenv-win](https://github.com/pyenv-win/pyenv-win) to download and change versions.  Make sure to
  close all command shells (including VSCode) after doing this, to get the latest environment
  variables.  Check with `python --version`.
  - NOTE: If you are running Windows 10 1905 or newer, you might need to disable the built-in Python
  launcher via Start > "Manage App Execution Aliases" and turning off the "App Installer" aliases
  for Python"
- `node-gyp` (the Node to C++ binding environment) requires Visual Studio with C++ extensions.  See
  [this
  page](https://nodejs.github.io/node-addon-examples/getting-started/tools/#:~:text=It%20is%20not%20necessary%20to,that%20has%20everything%20you%20need.) for a simple to install package that may work (not tested, as my system already has it already
  installed).
- Create an empty directory `C:\nest`.  I've not spent the time to figure out why this is required,
  but it appears to be so.

### Building

- `npm install`
- `npm run w:build`
- `npm run w:start`

## Clean builds

Two clean options:
- For regular clean of build artifacts, use `npm run w:clean` and then `npm run w:build`.
- To remove everything, including `node_modules` use `npm run w:fullclean`, then [build](#building) again.

## Create a distribution build

To build a distribution set of files, run:

- `npm run w:dist`

The resulting files will be located in `.\deepnest-win32-x64`.  All files need to be distributed,
meaning a ZIP file or writing a simple installer would be needed to avoid handling a larger number
of files.

## Debugging hint

In `main.js`, uncomment the two lines with `openDevTools` and the browser debugger pane will appear.