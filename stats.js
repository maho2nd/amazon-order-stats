var ajax = {};
ajax.x = function () {
    if (typeof XMLHttpRequest !== 'undefined') {
        return new XMLHttpRequest();
    }
    var versions = [
        "MSXML2.XmlHttp.6.0",
        "MSXML2.XmlHttp.5.0",
        "MSXML2.XmlHttp.4.0",
        "MSXML2.XmlHttp.3.0",
        "MSXML2.XmlHttp.2.0",
        "Microsoft.XmlHttp"
    ];

    var xhr;
    for (var i = 0; i < versions.length; i++) {
        try {
            xhr = new ActiveXObject(versions[i]);
            break;
        } catch (e) {
        }
    }
    return xhr;
};

ajax.send = function (url, callback, method, data, async) {
    if (async === undefined) {
        async = true;
    }
    var x = ajax.x();
    x.open(method, url, async);
    x.onreadystatechange = function () {
        if (x.readyState == 4) {
            callback(x.responseText)
        }
    };
    if (method == 'POST') {
        x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    x.send(data)
};

ajax.get = function (url, data, callback, async) {
    var query = [];
    for (var key in data) {
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
    }
    ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, 'GET', null, async)
};


var data = {};

// Iterate over all years
var yearOptionValues= [];

document.querySelectorAll("#timePeriodForm select option").forEach(yearOption =>{
  var yearOptionValue = yearOption.value;
  if(!yearOptionValue.includes("year-")){
    return;
  }

  yearOptionValues.push(yearOptionValue);
});


function fetchYear(yearIndex){
  var yearOptionValue = yearOptionValues[yearIndex];

  var year = parseInt(yearOptionValue.replace("year-", ""));  

  console.debug("Fetching year " + year + " started");

  ajax.get(window.location.origin + window.location.pathname , {orderFilter: yearOptionValue}, function(data) {
    var el = document.createElement( 'html' );
    el.innerHTML = data;
    parsePage(yearIndex, year, el); 
  });
}

function parsePage(yearIndex, year, rootElement, orderData){
  var orderData = orderData  || [];

  rootElement.querySelectorAll(".a-box-group").forEach(orderElement => {
    var orderDetailElements = orderElement.querySelectorAll(".a-color-secondary.value");

    var returned = orderElement.textContent.includes("Rücksendung abgeschlossen");

    var sDate       = orderDetailElements[0].textContent.trim();
    var sPriceTotal = orderDetailElements[1].textContent.trim();
    
    var priceTotal = parseFloat(sPriceTotal.replace("EUR ","").replace(",","."))

    if(orderDetailElements.length == 3){
      orderData.push({
        "order_date": sDate,
        "total"     : priceTotal,
        "returned"  : returned 
      });
    }
  });

  var nextPageElement = rootElement.querySelector("li.a-last a");

  if(nextPageElement){
    console.debug("next page");

    var nextPageUrl = nextPageElement.href;
    ajax.get(nextPageUrl, {}, function(data) {
      var el = document.createElement( 'html' );
      el.innerHTML = data;
      parsePage(yearIndex, year, el, orderData );
    });
  }else{
    console.debug("Fetching year " + year + " finished");
  
    printStats(year, orderData);       

    if((yearIndex+1) < yearOptionValues.length){
      fetchYear(yearIndex+1); 
    }else{
      console.log("Finished");
    }
  }
}

function printStats(year, orderData){
  var total = 0;
  var totalReturned = 0;
  
  orderData.forEach(order =>{
    if(order.returned){
      totalReturned += order.total;
    }else{
      total += order.total;
    }
  });

  console.log("Year " + year + " total:"  + Math.round(total) + "; orders: " + orderData.length + "; returned: " + totalReturned);  
}


fetchYear(0);
