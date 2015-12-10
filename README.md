# Pts => Interpolation

given a road network and a set of address points in vector tile form, generate an interpolation network.

## Input Data

### Point Vector tiles

Input geojson `FeatureCollection` file of points. Each point should have a property called `street` containing the street name
and `number` containing the street address.

tippecanoe -z14 -Z14 -l addresses -n Addresses -pf -pk -r 0 -o addresses.mbtiles addresses.geojson

### Street Vector tiles

Input geojson `FeatureCollection` file of lines. Each line should have a property called `street` containing the street name.

tippecanoe -z14 -Z14 -y street -l streets -n Streets -ps -pf -pk -o streets.mbtiles streets.geojson
