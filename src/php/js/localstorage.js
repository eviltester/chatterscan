function storeArrayLocally(storageKey, theArray){
    if(localStorage){
        localStorage.setItem(storageKey, JSON.stringify(theArray));
    }
}

function storeKeyedArrayLocally(storageKey, theArray){
    if(localStorage){
        localStorage.setItem(storageKey, JSON.stringify({ ...theArray }));
    }
}

// https://stackoverflow.com/questions/16232915/copying-an-array-of-objects-into-another-array-in-javascript
function loadArrayFromLocal(storageKey, theArray){
    if(localStorage && localStorage[storageKey]){

        var storageArray = JSON.parse(localStorage.getItem(storageKey));
        theArray.push.apply(theArray, storageArray);
    }
}

// https://stackoverflow.com/questions/55428816/json-stringify-omits-custom-keys-in-array
function loadKeyedArrayFromLocal(storageKey, theArray){
    if(localStorage && localStorage[storageKey]){

        const json = localStorage.getItem(storageKey);
        let keyedArray = Object.entries(JSON.parse(json)).reduce((arr, [key, value]) => (arr[key] = value, arr), []);
        Object.keys(keyedArray).forEach(key => theArray[key]=keyedArray[key]);
    }
}