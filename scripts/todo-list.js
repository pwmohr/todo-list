/**
 * A single ToDo in our list of Todos.
 * @typedef {Object} ToDo
 * @property {string} id - A unique ID to identify this todo.
 * @property {string} label - The text of the todo.
 * @property {boolean} isDone - Marks whether the todo is done.
 * @property {string} userId - The user who owns this todo.
 */

/**
 * A class which holds some constants for todo-list
 */
class ToDoList {
    static ID = 'todo-list';

    static FLAGS = {
        TODOS: 'todos'
    }

    static TEMPLATES = {
        TODOLIST: `modules/${this.ID}/templates/todo-list.hbs`
    }

    static initialize() {
        this.toDoListConfig = new ToDoListConfig();
    }

  /**
   * A small helper function which leverages developer mode flags to gate debug logs.
   * 
   * @param {boolean} force - forces the log even if the debug flag is not on
   * @param  {...any} args - what to log
   */
    static log(force, ...args) {  
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
    
        if (shouldLog) {
          console.log(this.ID, '|', ...args);
        }
    }
}

/**
 * A class which allows us to interact with todo list data
 */
 class ToDoListData {
    // All todos for all users
    static get allToDos() {
        const allToDos = game.users.reduce((accumulator, user) => {
            const userTodos = this.getToDosForUser(user.id);

            return {
            ...accumulator,
            ...userTodos
            }
        }, {});

        return allToDos;
    }

    // Get all tools for a given user
    static getToDosForUser(userId) {
        return game.users.get(userId)?.getFlag(ToDoList.ID, ToDoList.FLAGS.TODOS);
    }

    // Create a new todo for a given user
    static createToDo(userId, toDoData) {
        // Create a unique ID
        const newToDo = {
            isDone: false,
            ...toDoData,
            id: foundry.utils.randomID(16),
            userId
        }

        const newToDos = {
            [newToDo.id]: newToDo
        }

        // Update the database with the new ToDos
        return game.users.get(userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, newToDos);
    }

    // Update a specific todo by id with the provided updateData
    static updateToDo(toDoId, updateData) {
        const relevantToDo = this.allToDos[toDoId];

        // create the update to send
        const update = {
            [toDoId]: updateData
        }

        // update the database with the updated ToDo list
        return game.users.get(relevantToDo.userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, update);
    }

    static updateUserToDos(userId, updateData) {
        return game.users.get(userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, updateData);
    }

    // Delete a specific todo by id
    static deleteToDo(toDoId) {
        const relevantToDo = this.allToDos[toDoId];

        // Foundry-specific syntax required to delete a key from a persistent object in the database
        const keyDeletion = {
            [`-=${toDoId}`]: null
        }

        // Update the database with the updated ToDo list
        return game.users.get(relevantToDo.userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, keyDeletion);
    }
}

/**
 * Class to handle UI stuff
 */
class ToDoListConfig extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            height: 'auto',
            id: 'todo-list',
            template: ToDoList.TEMPLATES.TODOLIST,
            title: 'To Do List',
            userId: game.userId,
            closeOnSubmit: false,   // do not close when submitted
            submitOnChange: true,   // submit when any input changes
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    getData(options) {
        return {
            todos: ToDoListData.getToDosForUser(options.userId)
        }
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);

        ToDoList.log(false, 'saving', {
            formData,
            expandedData
        });

        await ToDoListData.updateUserToDos(this.options.userId, expandedData);

        this.render();
    }
}

/**
 * Register our module's debug flag with developer mode's custom hook
 */
Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    ToDoList.log(false, 'ToDoList | Registering to devMode.')
    registerPackageDebugFlag(ToDoList.ID);
});

/**
 * Initialize our app
 */
Hooks.once('init', () => {
    ToDoList.initialize();
});

/**
 * Add a hook to add a button when the player list is rendered.
 */
Hooks.on('renderPlayerList', (playerList, html) => {
    // Find the element which has our logged-in user's id
    const loggedInUserListItem = html.find(`[data-user-id="${game.userId}"]`);

    // create localized tooltip
    const tooltip = game.i18n.localize('TODO-LIST.button-title');

    // Insert a button at the end of this element
    loggedInUserListItem.append(
        `<button type='button' class='todo-list-icon-button flex0' title='${tooltip}'><i class='fas fa-tasks'></i></button>`
    );

    // Add an event listener for when someone clicks on the button
    html.on('click', '.todo-list-icon-button', (event) => {
        const userId = $(event.currentTarget).parents('[data-user-id]')?.data()?.userId;
        ToDoList.toDoListConfig.render(true, {userId}),
        ToDoList.log(true, 'Button Clicked!');
    });
});

