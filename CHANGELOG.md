### v2.2.2

- Use centre coord to avoid being rejected by carmen's verify centroid

### v2.2.1

- Use first coord in linestring as carmen:center to avoid miscalculated centroids

### v2.2.0

- Add --map function which allows non-standard vector tiles to be mapped into the address/street standard defined in the readme
- Add demo qa-tiles mapper function

### v2.1.1

- Pin mapnik version to allow binary installation (3.5.13)

### v2.1.0

- Allow zooms other than 14.

### v2.0.0

- Output in carmen range format for easy indexing
- convert command now works with line delimited Features or FeatureCollections
- Support non-continuous streets and divide addresses between them
