// This file manages the overall application state

class App {
    constructor() {
        this.state = {
            currentTab: 'home',
            userData: null
        };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    getState() {
        return this.state;
    }
}

export const app = new App();