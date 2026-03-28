let arr = [];
const algorithms = {
    bubble: bubbleSort,
    insertion: insertSort,
    selection: selectSort,
};
function CreateArr(size) {
    let arr = [];
    for (let i = 0; i < size; i++) {
        arr.push(Math.floor(Math.random() * 100) + 1);
    }
    return arr;
}
function render(arr, container) {
    container.innerHTML = "";
    arr.forEach((value) => {
        let div = document.createElement("div");
        div.style.height = value * 3 + "px";
        div.style.width = "20px";
        div.style.backgroundColor = "blue";
        div.style.display = "inline-block";
        div.style.marginRight = "5px";
        container.appendChild(div);
    });
}
function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
// 冒泡排序
async function bubbleSort(arr, container) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                let temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;

                render(arr, container);
                await sleep(1000);
            }
        }
    }
}
// 插入排序
async function insertSort(arr, container) {
    for (let left = 0; left < arr.length - 1; left++) {
        let i = left;
        let key = arr[i + 1];
        arr[i + 1] = 0;
        render(arr, container);
        await sleep(1000);
        while (i >= 0 && arr[i] > key) {
            arr[i + 1] = arr[i];
            arr[i] = 0;
            i -= 1;
            render(arr, container);
            await sleep(1000);
        }
        arr[i + 1] = key;
        render(arr, container);
        await sleep(1000);
    }
}
// 选择排序
async function selectSort(arr, container) {
    for (let i = 0; i < arr.length - 1; i++) {
        let key = i;
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[key] > arr[j]) {
                key = j;
            }
        }
        let tmp = arr[i];
        arr[i] = arr[key];
        arr[key] = tmp;
        render(arr, container);
        await sleep(1000);
    }
}

document.getElementsByClassName("create")[0].onclick = function () {
    let size = document.getElementById("sizeInput").value;
    size = parseInt(size);
    if (isNaN(size) || size <= 0) {
        alert("请输入有效数字");
        return;
    }
    arr = CreateArr(size);
    render(arr, document.getElementById("array-visualization"));
};

let isSorting = false;
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
