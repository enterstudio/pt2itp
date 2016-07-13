# CHANGELOG

# Emoji Cheatsheet
- :pencil2: doc updates
- :bug: when fixing a bug
- :rocket: when making general improvements
- :white_check_mark: when adding tests
- :arrow_up: when upgrading dependencies
- :tada: when adding new features

### v3.0.0
- :rocket: `[lr]parity` => `parity[lr]` as per the carmen spec

### v2.10.1
- :bug: Fix hard error on debug output when r/l start/end is autoincremented due to differing parity

### v2.10.0
- :tada: parity is now assigned any time there is a valid start/end address
- :tada: if only start/end is assigned then end/start is made to equal it

### v2.9.1
- :arrow_up: `eslint@3.0.1`
- :arrow_up: `turf@3.0.14`

### v2.9.0
- :white_check_mark: Add a ton of more tests to explode functions
- :tada: Explode will not join if the resultant geometry self intersects (Less mixed odd/even addresses)
- :tada: Explode will not join if angle of join is > 45deg (default - configurable) (Fixes dual carriageways)
- :tada: Explode will has default max line length of 1 segment over 1km. (More accurate ITP segments)

### v2.8.2
- :bug: `cluster#clusterCluster` now sorts internally
- :bug: `cluster#closestCluster` doesn't include empty arrays of streets outside the buffer
- :white_check_mark: Add basic `cluster#closestCluster` test to make sure nothing breaks

### v2.8.1
- :arrow_up: d3-queue@3.0.1
- :arrow_up: eslint@2.13.1

### v2.8.0
- :tada: qa-tiles map now emits string for single name or array for multiple street names (alternates)
- :rocket: :white_check_mark: generalize `name#tokenizeFeats` and `worker#tokenizeFeats` to single `tokenize#perFeats` & add tests
- :tada: :white_check_mark: `tokenize#perFeats` now handles alternate names by creating duplicate geometries with each name and a list of alternates for each + add tests
- :tada: `interpolize` now adds alterate array to `carmen:text` (comma delimited)

### v2.7.1
- :tada: Allow `unclassified` highway type in qa-tiles map
- :bug: Explode streets after autoname function to ensure they are clustered properly

### v2.7.0
- :tada: Add streaming input/output option to `convert` module.
- :tada: `--input` and `--output` are now optional - falling back to stdout and stdin

### v2.6.0
- :tada: Add `--name` flag to `map` mode which will attempt to autoname roads
- :tada: Make `name` mode use generic closestCluster to share with `map` mode
- :tada: :white_check_mark: Add road side buffering module and tests

### v2.5.3
- :bug: Parse integers from --xy as internal functions expect integers

### v2.5.2
- :white_check_mark: Add split test

### v2.5.1
- :white_check_mark: Add expansive tests to bring coverage from ~50% to ~85%
- :tada: Change debug output slightly to be able to better generate unit tests

### v2.5.0

- Add name mode which will dump unnamed streets, when combined with the --debug flag it will also include the 2 address clusters which have the highest probability of having the correct street name.
- Add --raw <TYPE> mode which allows dumping of address data in a given tile (works for map and name mode ToDo allow streets & \*)
- Add plurals as aliases so I have to check my own docs less

### v2.4.2

- Retain `carmen:text` field in cluster module

### v2.4.1

- Fix bug in explode.js where explode would silently drop a LineString if it was the last unconnected LineString in a MultiLineString.

### v2.4.0

- Add --zoom option to specify non-standard zoom
- Add --xy & --coords options to only process a single tile for debug work

### v2.3.0

- Use centroid verification to ensure calculated centroid is within tile
- Fall back from point-on-surface to centre of z14 tile

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
