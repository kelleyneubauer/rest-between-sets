/** 
 * helper.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 * 
 * Helper functions
 */

function getTimestamp() {
    return new Date();
}

function removeElement(arr, element) {
    const index = arr.indexOf(element);
    if (index >= 0) {
        arr.splice(index, 1);
    }
    return arr;
}

module.exports = {
	getTimestamp,
	removeElement
};