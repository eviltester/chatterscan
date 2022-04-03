window.addEventListener('load', (event) => {

    var apicall = 'twitterapi.php?apicall=ratelimits';

    fetch(apicall)
        .then(response => {
            console.log(response);
            return response.json()
        })
        .then(data => {
            console.log(data);

            html = "";

            rateLimitsBreached = [];

            Object.entries(data.resources).forEach(entry => {
                const [key, value] = entry;
                console.log(key, value);
                html = html+`<h2>${key}</h2>`;

                html=html+`
                <style>
                    table {
                        border-collapse: collapse;
                        border: 2px solid rgb(0,0,0);
                    }
                    th,td{
                        border: 1px solid rgb(0,0,0);
                        padding: 5px 10px;
                    }
                </style>
                `

                html = html+`
                    <table style="">
                        <thead>
                        <tr>
                            <th>API</th>
                            <th>Limit</th>
                            <th>Remaining</th>
                        </tr>  
                        </thead>
                        <tbody>                    
                `;
                Object.entries(value).forEach(entry => {
                    const [key, value] = entry;
                    var limit= value.limit;
                    var remaining = value.remaining;
                    var resetdate = new Date(value.reset);
                    text = `${key} : limit (${limit}), remaining (${remaining})`;
                    //html = html + `<li>${text}</li>`;
                    html = html + `
                        <tr>
                            <td>${key}</td>
                            <td>${limit}</td>
                            <td>${remaining}</td>
                        </tr>`;
                    if(remaining==0){
                        rateLimitsBreached.push(text);
                    }
                });
                html = html+"</tbody></table>";
            });

            htmlheader = '<h2>Rate Limits Breached</h2><ul>'
            rateLimitsBreached.forEach(limit =>{
                htmlheader = htmlheader + `<li>${limit}</li>`
            })
            htmlheader =  htmlheader + "</ul>"

            html = htmlheader + html;

            parent =document.getElementById("content-here");
//            pre = document.createElement("pre")
//            pre.innerText = JSON.stringify(data, undefined, 4);
            parent.innerHTML = html;
//            parent.appendChild(pre)

        });
});