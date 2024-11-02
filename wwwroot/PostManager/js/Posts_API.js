const API_URL = "http://localhost:5000/api/posts";
let currentHttpError = "";

function API_getcurrentHttpError () {
    return currentHttpError; 
}
function HEAD() {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL,
            type: 'HEAD',
            contentType: 'text/plain',
            complete: data => { resolve(data.getResponseHeader('ETag')); },
            error: (xhr) => { console.log(xhr); resolve(null); }
        });
    });
}
function API_GetPosts() {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL,
            success: posts => { currentHttpError = ""; resolve(posts); },
            error: (xhr) => { console.log(xhr); resolve(null); }
        });
    });
}
function API_GetPost(postId) {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL + "/" + postId,
            success: post => { currentHttpError = ""; resolve(post); },
            error: (xhr) => { currentHttpError = xhr.responseJSON.error_description; resolve(null); }
        });
    });
}
function API_SavePost(post, create) {
    return new Promise(resolve => {
        $.ajax({
            url: create ? API_URL :  API_URL + "/" + post.Id,
            type: create ? "POST" : "PUT",
            contentType: 'application/json',
            data: JSON.stringify(post),
            success: (/*data*/) => { currentHttpError = ""; resolve(true); },
            error: (xhr) => {currentHttpError = xhr.responseJSON.error_description; resolve(false /*xhr.status*/); }
        });
    });
}
function API_DeletePost(id) {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL + "/" + id,
            type: "DELETE",
            success: () => { currentHttpError = ""; resolve(true); },
            error: (xhr) => { currentHttpError = xhr.responseJSON.error_description; resolve(false /*xhr.status*/); }
        });
    });
}