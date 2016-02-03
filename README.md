# Pts => Interpolation

[![Coverage Status](https://coveralls.io/repos/github/ingalls/pt2itp/badge.svg?branch=master)](https://coveralls.io/github/ingalls/pt2itp?branch=master)]](https://coveralls.io/github/ingalls/pt2itp)
[![Circle CI](https://circleci.com/gh/ingalls/pt2itp/tree/master.svg?style=svg)](https://circleci.com/gh/ingalls/pt2itp/tree/master)
[![David DM](https://david-dm.org/ingalls/pt2itp.svg)]](https://david-dm.org/ingalls/pt2itp)

given a road network and a set of address points in vector tile form, generate an interpolation network.

## Input Data

### Point Vector tiles

Input geojson `FeatureCollection` file of points. Each point should have a property called `street` containing the street name
and `number` containing the street address.

tippecanoe -z14 -Z14 -l addresses -n Addresses -pf -pk -r 0 -o addresses.mbtiles addresses.geojson

### Street Vector tiles

Input geojson `FeatureCollection` file of lines. Each line should have a property called `street` containing the street name.

tippecanoe -z14 -Z14 -y street -l streets -n Streets -ps -pf -pk -o streets.mbtiles streets.geojson
