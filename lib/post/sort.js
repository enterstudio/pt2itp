const _ = require('lodash');

module.exports.post = (feat) => {
    if (!feat || !feat.properties || !feat.properties['carmen:addressnumber']) return feat;

    for (let i = 0; i < feat.properties['carmen:addressnumber'].length; i++) {
        if (!feat.properties['carmen:addressnumber'][i] && !Array.isArray(feat.properties['carmen:addressnumber'][i])) continue;

        let nums = _.cloneDeep(feat.properties['carmen:addressnumber'][i]);
        let crds = [];

        nums.sort((a, b) => {
            return a - b;
        });

        for (let num of nums) {
            crds.push(feat.geometry.geometries[i].coordinates[feat.properties['carmen:addressnumber'][i].indexOf(num)]);
        }

        feat.properties['carmen:addressnumber'][i] = nums;
        feat.geometry.geometries[i].coordinates = crds;
    }

    return feat;
}
