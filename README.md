# Pts => Interpolation

[![Coverage Status](https://coveralls.io/repos/github/ingalls/pt2itp/badge.svg?branch=master)](https://coveralls.io/github/ingalls/pt2itp?branch=master)
[![Circle CI](https://circleci.com/gh/ingalls/pt2itp/tree/master.svg?style=svg)](https://circleci.com/gh/ingalls/pt2itp/tree/master)
[![David DM](https://david-dm.org/ingalls/pt2itp.svg)](https://david-dm.org/ingalls/pt2itp)

Given a road network and a set of address points in vector tile form, output an interpolation network.

## Input Data

### Point Vector tiles

Input line-delimited geojson features of points. Each point should have a property called `street` containing the street name
and `number` containing the street address.

#### Example

```
{ "type": "Feature", "geometry": { "type": "Point", ... }, "properties": { "street": "Main Street", "number": 10 } }
{ "type": "Feature", "geometry": { "type": "Point", ... }, "properties": { "street": "Main Street", "number": 11 } }
...
```

`tippecanoe -z14 -Z14 -l addresses -n Addresses -pf -pk -r 0 -o addresses.mbtiles addresses.geojson`

### Street Vector tiles

Input line-delimited geojson features of lines. Each line should have a property called `street` containing the street name.

#### Example

```
{ "type": "Feature", "geometry": { "type": "LineString", ... }, "properties": { "street": "Main Street" } }
{ "type": "Feature", "geometry": { "type": "LineString", ... }, "properties": { "street": "Main Street" } }
...
```

`tippecanoe -z14 -Z14 -y street -l streets -n Streets -ps -pf -pk -o streets.mbtiles streets.geojson`

## Generating Interpolation Network

```
./index.js map --in-network=<FILE.mbtiles> --in-address=<File.mbtiles> --output=<File.geojson> --tokens=./lib/tokens/en.json"
```
