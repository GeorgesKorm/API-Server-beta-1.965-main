const periodicRefreshPeriod = 60;
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
        height: $("#sample").outerHeight() //changer la valeur pour tester le inifinite loading
    };
    currentETag = await HEAD();
    pageManager = new PageManager('scrollPanel', 'postsPanel', postItemLayout, renderPosts);
    $('#createPost').on("click", async function () {
        saveContentScrollPosition();
        renderCreatePostForm();
    });
    $('#abort').on("click", async function () {
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
                pageManager.reset();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}

function renderAbout() {
    saveContentScrollPosition();
    eraseContent();
    $("#createPost").hide();
    $("#abort").show();
    $("#actionTitle").text("À propos...");
    $("#content").append(
        $(`
            <div class="aboutContainer">
                <h2>Gestionnaire de favoris</h2>
                <hr>
                <p>
                    Petite application de gestion de favoris à titre de démonstration
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
    if (search != "") queryString += "&keywords=" + search;
    console.log(queryString);
    hold_Periodic_Refresh = false;
    showWaitingGif();
    $("#actionTitle").text("Liste des publications");
    $("#createPost").show();
    $("#abort").hide();
    let response = await API_GetPosts(queryString); 
    currentETag = response.ETag;
    let posts = response;
    compileCategories(posts)
    eraseContent();
    if (posts !== null) {
        posts.forEach(post => {
            if ((selectedCategory === "") || (selectedCategory === post.Category))
                $("#content").append(renderPost(post));
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
        // $(".PostRow").on("click", function (e) { e.preventDefault(); })
    } else {
        renderError("Service introuvable");
    }
}
function showWaitingGif() {
    $("#content").empty();
    $("#content").append($("<div class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
}
function eraseContent() {
    $("#content").empty();
}
function saveContentScrollPosition() {
    contentScrollPosition = $("#content")[0].scrollTop;
}
function restoreContentScrollPosition() {
    $("#content")[0].scrollTop = contentScrollPosition;
}
function renderError(message) {
    eraseContent();
    $("#content").append(
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
    showWaitingGif();
    let response = await API_GetPost(id)
    let post = response;
    if (post !== null)
        renderPostForm(post);
    else
        renderError("Post introuvable!");
}
async function renderDeletePostForm(id) {
    showWaitingGif();
    $("#createPost").hide();
    $("#abort").show();
    $("#actionTitle").text("Retrait");
    let response = await API_GetPost(id)
    let post = response;
    // let favicon = makeFavicon(Post.Image); //not useful maybe
    eraseContent();
    if (post !== null) {
        $("#content").append(`
        <div class="PostdeleteForm">
            <h4>Effacer la publication suivante?</h4>
            <br>
            <div class="postRow" Post_id="${post.Id}">
        <div class="postContainer noselect">
            <span class="postCategory">${post.Category}</span>
            <div class="cmdIconsContainer">
            </div>
            <span class="postTitle">${post.Title}</span>
            <div class="postImage" style="background-image:url('${post.Image}')"></div>
            <span class="postDate">${secondsToDateString(post.Creation)}</span>
            <br>
            <span class="postDescriptionContainer expanded">${post.Text}</span>
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
            showWaitingGif();
            let result = await API_DeletePost(post.Id);
            if (result)
                pageManager.reset();
            else
                renderError("Une erreur est survenue!");
        });
        $('#cancel').on("click", function () {
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
function newPost() {
    post = {};
    post.Id = 0;
    post.Title = "";
    post.Text = "";
    post.Category = "";
    post.Image = "";
    post.Creation = Math.floor(Date.now() / 1000);
    return post;
}
function renderPostForm(post = null) {
    $("#createPost").hide();
    $("#abort").show();
    eraseContent();
    hold_Periodic_Refresh = true;
    let create = post == null;
    if (create){
        post = newPost();
        post.Image = "images/noPic.jpg";
    }
    else
        $("#actionTitle").text(create ? "Création" : "Modification");
    $("#content").append(`
        <form class="form" id="PostForm">
            <a href="${post.Title}" target="_blank" id="faviconLink" class="big-favicon" ></a>
            <br>
            <input type="hidden" name="Id" value="${post.Id}"/>

            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control Text"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Description </label>
            <textarea
                class="form-control Text"
                name="Text"
                id="Text"
                placeholder="Texte"
                required
            >${post.Text}</textarea>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <input 
                type="hidden"
                class="form-control"
                name="Creation"
                id="Creation"
                placeholder="Date de création"
                required
                value="${post.Creation}"
            />
            <label class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${post.Image}' 
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
        let post = getFormData($("#PostForm"));
        showWaitingGif();
        let result = await API_SavePost(post, create);
        if (result)
            pageManager.reset();

        else
            renderError("Une erreur est survenue!");
    });
    $('#cancel').on("click", function () {
        pageManager.reset();
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
function renderPost(post) {
    return $(`
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
        <hr>
    `);
}

$(document).on('click', '.showMoreBtn', function() {
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