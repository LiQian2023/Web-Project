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
let isSorting = false;
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
    if (isNaN(time) || time <= 0) {
        alert("请输入有效时间(正数):>");
        return;
    }
    arr = CreateArr(size);
    ArrayRender(arr, document.getElementById("array-visualization"));
};

// ----------渲染算法----------
// 单个柱子渲染封装
function Rendering(container, value, index, activeIndex = [], flag = false) {
    let div = document.createElement("div");
    div.className = "bar";
    if (activeIndex.includes(index)) {
        div.classList.add("active");
    }
    if (flag) {
        div.style.marginLeft = size * 25 + "px";
    }
    div.style.height = value * 3 + "px";
    container.appendChild(div);
}
// 数组渲染
function ArrayRender(arr, container, activeIndex = []) {
    container.innerHTML = "";
    arr.forEach((value, index) => {
        Rendering(container, value, index, activeIndex);
    });
}
function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
// ----------排序算法----------
// 冒泡排序
async function bubbleSort(arr, container) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
            ArrayRender(arr, container, [j, j + 1]);
            await sleep(time);
            if (arr[j] > arr[j + 1]) {
                let temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                ArrayRender(arr, container, [j, j + 1]);
                await sleep(time);
            }
        }
    }
    ArrayRender(arr, container);
    await sleep(time);
}
// 插入排序
async function insertSort(arr, container) {
    for (let left = 0; left < arr.length - 1; left++) {
        let i = left;
        let key = arr[i + 1];
        arr[i + 1] = 0;
        ArrayRender(arr, container, [i, i + 1]);
        Rendering(container, key, left, [left], true);
        await sleep(time);
        while (i >= 0 && arr[i] > key) {
            arr[i + 1] = arr[i];
            arr[i] = 0;
            i -= 1;
            ArrayRender(arr, container, [i, i + 1]);
            Rendering(container, key, left, [left], true);
            await sleep(time);
        }
        arr[i + 1] = key;
        ArrayRender(arr, container, [i, i + 1]);
        await sleep(time);
    }
    ArrayRender(arr, container);
    await sleep(time);
}
// 选择排序
async function selectSort(arr, container) {
    for (let i = 0; i < arr.length - 1; i++) {
        let key = i;
        for (let j = i + 1; j < arr.length; j++) {
            ArrayRender(arr, container, [key, j]);
            await sleep(time);
            if (arr[key] > arr[j]) {
                key = j;
            }
        }
        let tmp = arr[i];
        arr[i] = arr[key];
        arr[key] = tmp;
        ArrayRender(arr, container, [key, i]);
        await sleep(time);
    }
    ArrayRender(arr, container);
    await sleep(time);
}
// ----------执行算法----------
// 执行排序
document.querySelectorAll(".start").forEach((btn) => {
    btn.onclick = async function () {
        if (isSorting) return;
        isSorting = true;
        if (arr.length === 0) {
            alert("请先生成数组");
            return;
        }
        const type = this.dataset.type;
        const section = this.parentElement;
        const container = section.querySelector(".visualization");

        let arrCopy = [...arr];
        await algorithms[type](arrCopy, container);
        isSorting = false;
    };
});
// 算法比较
async function performanceSort(arr, container) {}
