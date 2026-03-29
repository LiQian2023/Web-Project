// ----------全局变量----------
let arr = [];
let time = 0;
let size = 0;
const algorithms = {
    bubble: bubbleSort,
    insertion: insertSort,
    selection: selectSort,
    performance: performanceSort,
};
let isPaused = false;
let resumeResolve = null;
let isSorting = false;
let isComparing = false;
// ----------创建数组----------
function CreateArr(size) {
    let arr = [];
    for (let i = 0; i < size; i++) {
        arr.push(Math.floor(Math.random() * 100) + 1);
    }
    return arr;
}
document.getElementsByClassName("create")[0].onclick = function () {
    size = document.getElementById("sizeInput").value;
    time = document.getElementById("time").value;
    size = parseInt(size);
    time = parseInt(time);
    if (isNaN(size) || size <= 0) {
        alert("请输入有效大小(正整数):>");
        return;
    }
    time = isNaN(time) || time <= 0 ? 1000 : time;
    arr = CreateArr(size);
    ArrayRender(arr, document.getElementById("array-visualization"));
};

// ----------渲染算法----------
// 单个柱子渲染封装
function Rendering(container, value, index, options = {}) {
    const { activeIndex = [], flag = false, sortedIndex = [] } = options;
    let div = document.createElement("div");
    div.className = "bar";
    if (sortedIndex.includes(index)) {
        div.classList.add("sorted");
    } else if (activeIndex.includes(index)) {
        div.classList.add("active");
    }
    if (flag) {
        div.style.marginLeft = size * 5 + "px";
    }

    div.style.height = value * 3 + "px";
    container.appendChild(div);
}
// 数组渲染
function ArrayRender(arr, container, options = {}) {
    container.innerHTML = "";
    arr.forEach((value, index) => {
        Rendering(container, value, index, options);
    });
}
// 睡眠函数
function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

// ----------全局控制----------
async function checkPaused() {
    if (!isPaused) return;
    await new Promise((resolve) => {
        resumeResolve = resolve;
    });
}
async function delay() {
    await checkPaused();
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

// ----------排序算法----------
// 冒泡排序
async function bubbleSort(arr, container) {
    let sortedIndex = [];
    for (let i = 0; i < arr.length; i++) {
        let swapped = false;
        let j = 0;
        for (j; j < arr.length - i - 1; j++) {
            ArrayRender(arr, container, {
                activeIndex: [j, j + 1],
                sortedIndex: sortedIndex,
            });
            await delay();
            if (arr[j] > arr[j + 1]) {
                let temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = true;
                ArrayRender(arr, container, {
                    activeIndex: [j, j + 1],
                    sortedIndex: sortedIndex,
                });
                await delay();
            }
        }
        sortedIndex.push(j);
        if (!swapped) {
            sortedIndex = arr.map((_, index) => index);
            break;
        }
    }
    ArrayRender(arr, container, { sorted: sortedIndex });
    await delay();
}
// 插入排序
async function insertSort(arr, container) {
    let sortedIndex = [];
    for (let left = 0; left < arr.length - 1; left++) {
        let i = left;
        let key = arr[i + 1];
        arr[i + 1] = 0;
        sortedIndex.push(left);
        ArrayRender(arr, container, {
            activeIndex: [i, i + 1],
            sorted: sortedIndex,
        });
        Rendering(container, key, left, { activeIndex: [left], flag: true });
        await delay();
        while (i >= 0 && arr[i] > key) {
            arr[i + 1] = arr[i];
            arr[i] = 0;
            i -= 1;
            ArrayRender(arr, container, {
                activeIndex: [i, i + 1],
                sortedIndex: sortedIndex,
            });
            Rendering(container, key, left, {
                activeIndex: [left],
                flag: true,
            });
            await delay();
        }
        arr[i + 1] = key;
        ArrayRender(arr, container, {
            activeIndex: [i, i + 1],
            sortedIndex: sortedIndex,
        });
        await delay();
    }
    sortedIndex.push(arr.length - 1);
    ArrayRender(arr, container, { sortedIndex: sortedIndex });
    await delay();
}
// 选择排序
async function selectSort(arr, container) {
    let sortedIndex = [];
    for (let i = 0; i < arr.length - 1; i++) {
        let key = i;
        for (let j = i + 1; j < arr.length; j++) {
            ArrayRender(arr, container, {
                activeIndex: [key, j],
                sortedIndex: sortedIndex,
            });
            await delay();
            if (arr[key] > arr[j]) {
                key = j;
            }
        }
        let tmp = arr[i];
        arr[i] = arr[key];
        arr[key] = tmp;
        sortedIndex.push(i);
        ArrayRender(arr, container, {
            activeIndex: [key, i],
            sortedIndex: sortedIndex,
        });
        await delay();
    }
    sortedIndex.push(arr.length - 1);
    ArrayRender(arr, container, { sortedIndex: sortedIndex });
    await delay();
}
// ----------执行算法----------
// 执行排序
document.querySelectorAll(".start").forEach((btn) => {
    btn.onclick = async function () {
        if (isSorting || isComparing) return;
        isSorting = true;
        if (arr.length === 0) {
            alert("请先生成数组");
            return;
        }
        const type = this.dataset.type;
        const section = this.closest("section.sort");
        const container = section.querySelector(".visualization");

        let arrCopy = [...arr];
        await algorithms[type](arrCopy, container);
        isSorting = false;
    };
});
// 执行暂停
document.querySelectorAll(".pause").forEach((btn) => {
    btn.onclick = function () {
        isPaused = true;
    };
});
// 执行继续
document.querySelectorAll(".resume").forEach((btn) => {
    btn.onclick = function () {
        isPaused = false;
        if (resumeResolve) {
            resumeResolve();
            resumeResolve = null;
        }
    };
});

// 算法比较
async function performanceSort(arr, container) {
    const bubblecontainer = document.getElementById("bubble-visualization");
    const insertcontainer = document.getElementById("insertion-visualization");
    const selectcontainer = document.getElementById("selection-visualization");

    let arrCopy1 = [...arr];
    let arrCopy2 = [...arr];
    let arrCopy3 = [...arr];

    isComparing = true;

    const start1 = performance.now();
    let t2, t3, t4, t5, t6;
    await Promise.all([
        (async () => {
            await bubbleSort(arrCopy1, bubblecontainer);
            t2 = performance.now();
        })(),
        (async () => {
            t3 = performance.now();
            await insertSort(arrCopy2, insertcontainer);
            t4 = performance.now();
        })(),
        (async () => {
            t5 = performance.now();
            await selectSort(arrCopy3, selectcontainer);
            t6 = performance.now();
        })(),
    ]);

    isComparing = false;

    container.innerHTML = `
        <p>冒泡排序: ${(t2 - start1).toFixed(2)} ms</p>
        <p>插入排序: ${(t4 - t3).toFixed(2)} ms</p>
        <p>选择排序: ${(t6 - t5).toFixed(2)} ms</p>
    `;
}
