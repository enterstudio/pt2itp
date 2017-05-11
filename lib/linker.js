/**
 * Generates a map of street => address
 */
module.exports = (street, addresses) => {
    let current;

    for (let address of addresses) {
        let addressName = address.text.split(' ');
        let score = 0;

        //Short Circuit if the text is exactly the same
        if (address.text === street.text) return address;

        let tokens = street.text.split(' ');
        for (let token of tokens) {

            //If token exists, add freq value as score - rare token match = higher score
            if (addressName.indexOf(token) !== -1) {
                score += freq[token];
            } else { //If the token does not exist - give it a score bump (% of tot freq score) for each character (L=>R) in the token it did match

            }
        }

        if (!current || current.score < score) {
            current = {
                score: score,
                feat: address
            }
        }
    }

    if (current && current.address) return current.address;

    return false;
}
