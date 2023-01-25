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

### Prerequisites

- Clone this fork with: `git clone --recurse-submodules --remote-submodules
  https://github.com/cmidgley/Deepnest`
- Download [Boost 1.62.0](https://sourceforge.net/projects/boost/files/boost/1.62.0/) and install it
 in `C:\local\boost_1_62_0`.  Verify that it is copied correctly by checking that the directory
 `C:\local\boost_1_62_0\boost` exists.
- Use [Node.js](https://nodejs.org) version 8.17.0.  Recommend using the Node version manager
  [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) to download Node and change
  versions.
- Ensure you are on Python 2.7 (Python 3 does not work).  Recommend using Python version manager
  [pyenv-win](https://github.com/pyenv-win/pyenv-win) to download and change versions.  Make sure to
  close all command shells (including VSCode) after doing this, to get the latest environment variables.

### Building

- `npm install`
- `npm run w:build`
- `npm run w:start`

## Clean build

Before building, issue `npm w:clean` to remove all artifacts, including `node_modules`.  Then run
the steps from [Building](#building).


- To package app run .\node_modules\.bin\electron-packager . deepnest --platform=win32 --arch=x64