function searchForHighlightedText(allowEdit=false){
    var selectedText = getHighlightedTextForSearching();
    if(selectedText.trim().length>0){
        searchForTerm(allowEdit, selectedText);
    }
}

function searchForHighlightedTextUsingSavedSearchGui(allowEdit=false){
    var selectedText = getHighlightedTextForSearching();
    if(selectedText.trim().length>0){
        searchForTerm(allowEdit, selectedText, false, true);
    }
}

function getHighlightedTextForSearching(){
    var selectedText = "";
    try{
        selectedText = document.getSelection().anchorNode.data.substr(document.getSelection().anchorOffset, document.getSelection().focusOffset-document.getSelection().anchorOffset);
    }catch(err){
        // ignore
    }
    if(selectedText.trim().length>0){
        return selectedText.trim();
    }else{
        alert("Select some text in the tweet and then you can search.");
    }
    return "";
}

function searchForTerm(allowEdit=false,chosenTerm="",newWindow = true, usingSavedSearchGui = false){
    var selectedText = chosenTerm;
    if(allowEdit){
        newSelectedText = prompt("Search Term", selectedText);
        if(!usingSavedSearchGui && (newSelectedText===null || newSelectedText.valueOf() == selectedText.valueOf())){
            return;
        }
        selectedText=newSelectedText;
    }
    var searchTerm = encodeURIComponent(selectedText);

    // location.assign("favourites.php?terms="+searchFor)
    let urlToOpen = window.location.origin + "/mainview.php?searchterm="+searchTerm;
    if(usingSavedSearchGui){
        urlToOpen = window.location.origin + "/favourites.php?terms="+searchTerm;
    }
    if(newWindow){
        window.open(urlToOpen);
    }else{
        location.assign(urlToOpen);
    }
}

function getEditSearchTermButton(currentSearchTerm){
    const decodedSearchTerm = decodeURIComponent(currentSearchTerm);
    const button = document.createElement("button");
    button.innerText="Edit Search";
    button.addEventListener('click',()=>{searchForTerm(true,decodedSearchTerm);})
    return button;
}

function getEditAdhocSearchButton(currentSearchTerm){
    const decodedSearchTerm = decodeURIComponent(currentSearchTerm);
    const button = document.createElement("button");
    button.innerText="Edit Adhoc Search";
    button.addEventListener('click',()=>{searchForTerm(true,decodedSearchTerm, true, true);})
    return button;
}

function addEditSearchTermButton(){

    // if search term container exists
    const container = document.querySelector(".edit-search-term");
    if(container===null){return;}

    // if search term present
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const currentSearchTerm = urlParams.get('searchterm')
    if(currentSearchTerm.length===0){return;}

    const formatting = document.createElement('p');
    formatting.style='text-align: center;';
    formatting.appendChild(getEditSearchTermButton(currentSearchTerm));
    formatting.appendChild(getEditAdhocSearchButton(currentSearchTerm));

    const searchDropDown = document.querySelector("[data-menuid='searchmenu']")
    if(searchDropDown!==null){
        const separator = document.createElement('div');
        separator.classList.add("menu-separator");
        separator.innerText="__ Current __"
        searchDropDown.appendChild(separator)
        searchDropDown.appendChild(getEditSearchTermButton(currentSearchTerm));
        searchDropDown.appendChild(getEditAdhocSearchButton(currentSearchTerm));
    }

    container.appendChild(formatting);
}