function searchForHighlightedText(allowEdit=false){
    var selectedText = "";
    try{
        selectedText = document.getSelection().anchorNode.data.substr(document.getSelection().anchorOffset, document.getSelection().focusOffset-document.getSelection().anchorOffset);
    }catch(err){
        // ignore
    }
    if(selectedText.trim().length>0){
        searchForTerm(allowEdit, selectedText);
    }else{
        alert("Select some text in the tweet and then you can click the 'go sel' button to search for it. 'edit sel' will let you edit the selection prior to searching for it.");
    }
}

function searchForTerm(allowEdit=false,chosenTerm=""){
    var selectedText = chosenTerm;
    if(allowEdit){
        newSelectedText = prompt("Search Term", selectedText);
        if(newSelectedText===null || newSelectedText.valueOf() == selectedText.valueOf()){
            return;
        }
        selectedText=newSelectedText;
    }
    var searchTerm = encodeURIComponent(selectedText);
    window.open(window.location.href.split("?")[0]+"?searchterm="+searchTerm);
}

function getEditSearchTermButton(currentSearchTerm){
    const decodedSearchTerm = decodeURIComponent(currentSearchTerm);
    const button = document.createElement("button");
    button.innerText="Edit Search";
    button.addEventListener('click',()=>{searchForTerm(true,decodedSearchTerm);})
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

    container.appendChild(formatting);
}