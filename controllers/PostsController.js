import PostModel from '../models/Post.js'; //Checker ça? devrait être en minuscule (post)
import Repository from '../models/repository.js';
import Controller from './Controller.js';

export default class PostsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }
    // list() { //peut-être pas.
    //     this.HttpContext.response.JSON(
    //         // this.repository.getAll(this.HttpContext.path.params, this.repository.ETag)
    //         this.repository.getAll('Creation,desc', this.repository.ETag)
    //     );
    // }
}