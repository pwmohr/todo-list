class TestClass {

    static ID='test-class';

    static FLAGS = {
        TEST: 'test',
        RESET: false,
    }

    static init() {
        this.initStatus = true;
    }
}

let t = new TestClass;