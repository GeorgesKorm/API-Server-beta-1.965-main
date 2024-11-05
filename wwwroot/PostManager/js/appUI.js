const periodicRefreshPeriod = 10;
let contentScrollPosition = 0;
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let search = "";
let endOfData = false;
let pageManager;

Init_UI();
function secondsToDateString(dateInSeconds, localizationId = 'fr-FR') {
    const hoursOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    return new Date(dateInSeconds * 1000).toLocaleDateString(localizationId, hoursOptions);
}
async function Init_UI() {
    let postItemLayout = {
        width: $("#sample").outerWidth(),
        height: $("#sample").outerHeight()
    };
    currentETag = await HEAD();
    let Posts = await API_GetPosts("?limit=1000&offset=0");  // Fetch all posts for categories
    compileCategories(Posts);
    pageManager = new PageManager('scrollPanel', 'postsPanel', postItemLayout, renderPosts);
    $('#createPost').on("click", async function () {
        saveContentScrollPosition();
        renderCreatePostForm();
    });
    $('#abort').on("click", async function () {
        $("#search").show();
        $("#scrollPanel").show();
        $(".aboutContainer").hide();
        pageManager.reset();
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $("#searchKey").on("change", () => {
        doSearch();
    })
    $('#doSearch').on('click', () => {
        doSearch();
    })
    start_Periodic_Refresh();
}
function doSearch() {
    search = $("#searchKey").val().replace(' ', ',');
    pageManager.reset();
}
function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                saveContentScrollPosition();
                pageManager.reset();
                restoreContentScrollPosition();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}

function renderAbout() {
    $("#search").hide();
    saveContentScrollPosition();
    eraseContent();
    $("#scrollPanel").hide();
    $("#createPost").hide();
    $("#abort").show();
    $("#actionTitle").text("À propos...");
    $("#content").append(
        $(`
            <div class="aboutContainer">
                <h2>Gestionnaire de Publications</h2>
                <hr>
                <p>
                    Petite application de gestion de publications à titre de démonstration
                    d'interface utilisateur monopage réactive.
                </p>
                <p>
                    Auteur: Nicolas Chourot
                </p>
                <p>
                    Collège Lionel-Groulx, automne 2023
                </p>
            </div>
        `))
}
function updateDropDownMenu(categories) {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        selectedCategory = "";
        //renderPosts();
        pageManager.reset();
    });
    $('.category').on("click", function () {
        selectedCategory = $(this).text().trim();
        pageManager.reset();
    });
}
function compileCategories(posts) {
    let categories = [];
    if (posts != null) {
        posts.forEach(post => {
            if (!categories.includes(post.Category))
                categories.push(post.Category);
        })
        updateDropDownMenu(categories);
    }
}
async function renderPosts(queryString) {
    if($("#PostForm").val() == undefined){

    if (search != "") queryString += "&keywords=" + search;
    hold_Periodic_Refresh = false;
    // addWaitingGif();
    $("#actionTitle").text("Liste des publications");
    $("#createPost").show();
    $("#abort").hide();
    let response = await API_GetPosts(queryString);
    currentETag = response.ETag;
    let Posts = response;
    let PostsCat = await API_GetPosts("?limit=1000&offset=0");
    //Posts.sort((a, b) => b.Creation - a.Creation);
    compileCategories(PostsCat);
    //eraseContent();
    // removeWaitingGif();
    if (Posts !== null) {
        Posts.forEach(Post => {
            if ((selectedCategory === "") || (selectedCategory === Post.Category))
                $("#postsPanel").append(renderPost(Post));
        });
        restoreContentScrollPosition();
        // Attached click events on command icons
        $(".editCmd").on("click", function () {
            saveContentScrollPosition();
            renderEditPostForm($(this).attr("editPostId"));
        });
        $(".deleteCmd").on("click", function () {
            saveContentScrollPosition();
            renderDeletePostForm($(this).attr("deletePostId"));
        });
    } else {
        renderError("Service introuvable");
    }
}
}
function addWaitingGif() {
    $("#postsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
}
function renderPost(post) {
        return $(`
            <div class="postRow" post_id=${post.Id}">
                <div class="postContainer">
                    <span class="postCategory">${post.Category}</span>
                    <div class="cmdIconsContainer">
                        <span class="editCmd cmdIcon fa fa-pencil" editPostId="${post.Id}" title="Modifier ${post.Title}"></span>
                        <span class="deleteCmd cmdIcon fa-solid fa-x" deletePostId="${post.Id}" title="Effacer ${post.Title}"></span>
                    </div>
                        <span class="postTitle">${post.Title}</span>
                        <div class="postImage" style="background-image:url('${post.Image}')"></div>
                        <span class="postDate">${secondsToDateString(post.Creation)}</span>
                        <br>
                        <span class="postDescriptionContainer collapsed">${post.Text}</span>
                        <button class="showMoreBtn btn btn-link p-0 mt-2">Afficher Plus</button>
               </div>
           </div>           
           `);
    }

function eraseContent() {
    $("#postsPanel").empty();
}
function saveContentScrollPosition() {
    console.log($("#scrollPanel")[0]);
    contentScrollPosition = $("#scrollPanel")[0].scrollTop;
}
function restoreContentScrollPosition() {
    console.log("Restore current scroll position "+contentScrollPosition);
    console.log("Is this the right value? " + $("#scrollPanel")[0].scrollTop);
    $("#scrollPanel")[0].scrollTop = contentScrollPosition;
    console.log("Value after restore "+$("#scrollPanel")[0].scrollTop);
}
function renderError(message) {
    eraseContent();
    $("#postsPanel").append(
        $(`
            <div class="errorContainer">
                ${message}
            </div>
        `)
    );
}
function renderCreatePostForm() {
    renderPostForm();
}
async function renderEditPostForm(id) {
    //hideScrollPanel(); //this doesn't work, ça retire notre form, parce qu'il est dans le scrollpanel
    hold_Periodic_Refresh = true;
    $("#search").hide();
    addWaitingGif();
    let response = await API_GetPost(id)
    let Post = response;
    if (Post !== null)
        renderPostForm(Post);
    else
        renderError("Post introuvable!");
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    hold_Periodic_Refresh = true;
    addWaitingGif();
    $("#search").hide();
    $("#createPost").hide();
    $("#abort").show();
    $("#actionTitle").text("Retrait");
    let response = await API_GetPost(id)
    let Post = response;
    // let favicon = makeFavicon(Post.Image); //not useful maybe
    eraseContent();
    if (Post !== null) {
        $("#postsPanel").append(`
        <div class="PostdeleteForm">
            <h4>Effacer la publication suivante?</h4>
            <br>
            <div class="postRow" Post_id="${Post.Id}">
        <div class="postContainer noselect">
            <span class="postCategory">${Post.Category}</span>
            <div class="cmdIconsContainer">
            </div>
            <span class="postTitle">${Post.Title}</span>
            <div class="postImage" style="background-image:url('${Post.Image}')"></div>
            <span class="postDate">${secondsToDateString(Post.Creation)}</span>
            <br>
            <span class="postDescriptionContainer expanded">${Post.Text}</span>
        </div>
        <div class="cmdButtonsCenter">
            <input type="button" value="Effacer" id="deletePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">   
        </div>

        <hr>    
    </div> 
            <br>
           </div>    
        `);
        $('#deletePost').on("click", async function () {
            addWaitingGif();
            $("#search").show();
            let result = await API_DeletePost(Post.Id);
            if (result)
                //renderPosts();
                pageManager.reset();
            else
                renderError("Une erreur est survenue!");
        });
        $('#cancel').on("click", function () {
            $("#search").show();
            eraseContent();
            pageManager.reset();
        });
    } else {
        renderError("Publication introuvable!");
    }
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
function removeWaitingGif() {
    $("#waitingGif").remove('');
}
function newPost() {
    Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Category = "";
    Post.Image = "";
    Post.Creation = Math.floor(Date.now() / 1000);
    return Post;
}
function renderPostForm(Post = null) {
    $("#createPost").hide();
    $("#abort").show();
    eraseContent();
    hold_Periodic_Refresh = true;
    let create = Post == null;
    if (create) {
        Post = newPost();
        Post.Image = "images/noPic.jpg";
    }
    else
        $("#actionTitle").text(create ? "Création" : "Modification");
    $("#postsPanel").append(`
        <form class="form" id="PostForm">
            <a href="${Post.Title}" target="_blank" id="faviconLink" class="big-favicon" ></a>
            <br>
            <input type="hidden" name="Id" value="${Post.Id}"/>

            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control Text"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${Post.Title}"
            />
            <label for="Url" class="form-label">Description </label>
            <textarea
                class="form-control Text"
                name="Text"
                id="Text"
                placeholder="Texte"
                required
            >${Post.Text}</textarea>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${Post.Category}"
            />
            <input 
                type="hidden"
                class="form-control"
                name="Creation"
                id="Creation"
                placeholder="Date de création"
                required
                value="${Post.Creation}"
            />
            <label class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${Post.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
            <hr>
            <br>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
    initImageUploaders();
    initFormValidation();
    $('#PostForm').on("submit", async function (event) {
        event.preventDefault();
        let Post = getFormData($("#PostForm"));
        addWaitingGif();
        let result = await API_SavePost(Post, create);
        eraseContent();
        $("#search").show();
        if (result)
            pageManager.reset();
        else
            renderError("Une erreur est survenue!");

    });
    $('#cancel').on("click", function () {
        addWaitingGif();
        eraseContent();
        pageManager.reset();
        $("#search").show();
        });
}
function makeFavicon(url, big = false) {
    // Utiliser l'API de google pour extraire le favicon du site pointé par url
    // retourne un élément div comportant le favicon en tant qu'image de fond
    ///////////////////////////////////////////////////////////////////////////
    if (url.slice(-1) != "/") url += "/";
    let faviconClass = "favicon";
    if (big) faviconClass = "big-favicon";
    url = "http://www.google.com/s2/favicons?sz=64&domain=" + url;
    return `<div class="${faviconClass}" style="background-image: url('${url}');"></div>`;
}
$(document).on('click', '.showMoreBtn', function () {
    const $descriptionContainer = $(this).siblings('.postDescriptionContainer');

    // Toggle the expanded class
    $descriptionContainer.toggleClass('expanded');

    // Change button text based on the current state
    if ($descriptionContainer.hasClass('expanded')) {
        $(this).text('Afficher Moins'); // Change to "Show Less"
    } else {
        $(this).text('Afficher Plus'); // Change back to "Show More"
    }
});