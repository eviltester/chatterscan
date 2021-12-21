/*
    Store hashtag counts in Session Storage

 */

function HashtagCountStorage(){

    this.forUser = function(userTag){
        this.userTag=userTag;
    }

    this.deleteHashTags = function(){
        var storage = window.sessionStorage;

        let prefixKey = "chatterscan.hashtagcount." + this.userTag;

        let hashTagsIndex = 1;

        let nextKey = prefixKey + "." + hashTagsIndex;
        let stored = storage.getItem(nextKey);
        while(stored!==null){
            storage.removeItem(nextKey);
            hashTagsIndex++;
            nextKey = prefixKey + "." + hashTagsIndex;
            stored = storage.getItem(nextKey);
        }
    }

    this.saveHashTags = function(hashTags){
        // given
        // hashtags['key'] = count
        // Save hashtags in blogs of X
        //"chatterscan.hashtagcount.USERTAG.1"

        // Object.getOwnPropertyNames(hashtagsCloud).map(key=>[key, hashtagsCloud[key]])
        // 5 meg limit on storage, don't worry about blowing it yet

        var storage = window.sessionStorage;
        let prefixKey = "chatterscan.hashtagcount." + this.userTag;
        let hashTagsIndex = 1;
        let nextKey = prefixKey + "." + hashTagsIndex;

        storage.setItem(nextKey, JSON.stringify(hashTags));

    }



    this.loadHashTags = function(){

        const hashTagsFromStorage = {};

        var storage = window.sessionStorage;
        let prefixKey = "chatterscan.hashtagcount." + this.userTag;
        let hashTagsIndex = 1;
        let nextKey = prefixKey + "." + hashTagsIndex;

        hashTagsJson = storage.getItem(nextKey);

        // repeat for each hashTagsIndex
        if(hashTagsJson!=null) {
            Object.assign(hashTagsFromStorage, JSON.parse(hashTagsJson));
        }

        return hashTagsFromStorage;
    }

    this.postHashtags = function(hashTags)
    {
        // hashtags['key'] = count
        var storage = window.sessionStorage;

        // wipe out all hashtag counts from session storage
        this.deleteHashTags();

        //"chatterscan.hashtagcount.USERTAG.1"

        // set all hashtag values in session storage from hashTags
        this.saveHashTags(hashTags);

    }
}