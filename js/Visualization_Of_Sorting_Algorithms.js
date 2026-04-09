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
let resumeResolvers = [];
let isSorting = false;
let isComparing = false;
let resizeTimer = null;
let maxVal = 0;
let barWidth = 0;
let gap = 5;
let containerHeight = 0;
// 临时状态
const TRANSIENT_CLASSES = [
    "active-compare-bubble",
    "active-compare-insertion",
    "active-compare-selection",
    "active-swap",
    "select",
    "tmp",
];
// 状态：高亮样式
const Status = {
    // 比较动画
    compare({ el, step }) {
        el.classList.add(`active-compare-${step.type}`);
    },
    // 选择最小值动画
    select({ el }) {
        el.classList.add("select");
    },
    // 完成排序动画
    sorted({ el }) {
        el.classList.add("sorted");
    },
    // 待排序区域样式
    tmp({ el }) {
        el.classList.add("tmp");
    },
    // 交换高亮
    swapHighlight({ el }) {
        el.classList.add("active-swap");
    },
};
// 即时动作
const Active = {
    // 交换动画（冒泡/选择保持不变）
    async swap({ container, runtimeArr, step }) {
        const [i, j] = step.indices;
        if (i >= runtimeArr.length || j >= runtimeArr.length) return;

        await flipSwap(container, i, j);
        [runtimeArr[i], runtimeArr[j]] = [runtimeArr[j], runtimeArr[i]];
    },

    // pick：只负责抬起 key
    async pick({ container, step, context }) {
        const [index] = step.indices;
        const bars = Array.from(getBars(container));
        const bar = bars[index];
        if (!bar) return;

        if (context.floatingBar === bar) return;

        const liftY = context.liftY || 30;
        const duration = Math.max(160, time * 0.6);

        bar.classList.add("swapping");
        bar.style.transition = `transform ${duration}ms ease`;
        bar.style.transform = `translateY(-${liftY}px)`;

        context.floatingBar = bar;
        context.floatingIndex = index;

        await sleep(duration);
    },

    // move：按 role 区分三种插入排序动作
    async move({ container, step, context }) {
        const [from, to] = step.indices;
        const role = step.role || "";

        let bars = Array.from(getBars(container));
        const movingBar = bars[from];
        const tmpBar = context.tmpBar;

        if (!movingBar) return;
        if (!tmpBar && step.type === "insertion") return;

        // 1) key: index -> n
        if (role === "toBuffer") {
            await flipReorder(
                container,
                () => {
                    // 先让真实 tmpBar 占据原 key 位置
                    container.insertBefore(tmpBar, movingBar);
                    // 再把 key 放到末尾 buffer 区
                    container.appendChild(movingBar);
                },
                context,
            );

            const newBars = Array.from(getBars(container));
            context.currentTmpIndex = newBars.indexOf(tmpBar);
            context.floatingIndex = newBars.indexOf(context.floatingBar);
            return;
        }

        // 2) shift: j -> holeIndex
        if (role === "shift") {
            await flipReorder(
                container,
                () => {
                    // 空位左移到 movingBar 原位置
                    container.insertBefore(tmpBar, movingBar);
                },
                context,
            );

            const newBars = Array.from(getBars(container));
            context.currentTmpIndex = newBars.indexOf(tmpBar);
            context.floatingIndex = newBars.indexOf(context.floatingBar);
            return;
        }

        // 3) key: n -> holeIndex
        if (role === "insertBack") {
            await flipReorder(
                container,
                () => {
                    // 先把浮动 key 插到 tmpBar 前（tmpBar 当前就在 hole 位置）
                    container.insertBefore(context.floatingBar, tmpBar);
                    // 再把 tmpBar 放回末尾 buffer 区
                    container.appendChild(tmpBar);
                },
                context,
            );

            const newBars = Array.from(getBars(container));
            context.currentTmpIndex = newBars.indexOf(tmpBar);
            context.floatingIndex = newBars.indexOf(context.floatingBar);
            return;
        }

        // 默认 move（兜底）
        await flipReorder(
            container,
            () => {
                bars = Array.from(getBars(container));
                const referenceNode =
                    from < to ? bars[to].nextSibling : bars[to];
                container.insertBefore(movingBar, referenceNode);
            },
            context,
        );

        const newBars = Array.from(getBars(container));
        context.currentTmpIndex = context.tmpBar
            ? newBars.indexOf(context.tmpBar)
            : null;
        context.floatingIndex = context.floatingBar
            ? newBars.indexOf(context.floatingBar)
            : null;
    },

    // insert：只负责让 key 落下
    async insert({ container, step, context }) {
        const [index] = step.indices;
        const bars = Array.from(getBars(container));
        const bar = bars[index];
        if (!bar) return;

        const targetBar = context.floatingBar || bar;
        const duration = Math.max(160, time * 0.6);

        targetBar.style.transition = `transform ${duration}ms ease`;
        targetBar.style.transform = "translate(0px, 0px)";

        await sleep(duration);

        targetBar.classList.remove("swapping");
        targetBar.style.transition = "";
        targetBar.style.transform = "";

        context.floatingBar = null;
        context.floatingIndex = null;
    },
};

// ----------创建数组----------
// 创建随机数组
function CreateArr(size) {
    let arr = [];
    for (let i = 0; i < size; i++) {
        arr.push(Math.floor(Math.random() * 100) + 1);
    }
    return arr;
}
// 获取DOM数据
document.getElementsByClassName("create")[0].onclick = function () {
    size = document.getElementById("sizeInput").value;
    time = document.getElementById("time").value;
    size = Number(size);
    time = Number(time);
    if (isNaN(size) || size < 5 || size > 50) {
        alert("请输入有效大小(5-50)>:");
        return;
    }
    // 默认时间自适应
    time = isNaN(time) || time <= 0 ? Math.max(20, 300 - size * 5) : time;
    arr = CreateArr(size);
    maxVal = Math.max(...arr);
    // 初始化柱子
    document.querySelectorAll(".visualization").forEach((container) => {
        initBars(arr, container);
    });
};

// ----------渲染算法----------
// 单个柱子渲染封装
function Rendering(container, value) {
    let div = document.createElement("div");
    div.className = "bar";
    // 宽度自适应
    div.style.width = barWidth + "px";
    // 高度自适应
    div.style.height = (value / maxVal) * containerHeight + "px";
    // 清除状态
    div.style.transform = "";
    div.style.transition = "";
    container.appendChild(div);
}
// 初始化数组
function initBars(arr, container) {
    container.innerHTML = "";
    let containerWidth = container.clientWidth;
    barWidth = Math.max(
        2,
        Math.floor((containerWidth - gap * (arr.length - 1)) / arr.length),
    );
    containerHeight = container.clientHeight;
    arr.forEach((value) => {
        Rendering(container, value);
    });
}
// 获取DOM元素
function getBars(container) {
    return container.children;
}
// 窗口resize事件监听，重新渲染柱子
window.addEventListener("resize", () => {
    if (isSorting || isComparing) return;

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        document.querySelectorAll(".visualization").forEach((container) => {
            initBars(arr, container);
        });
    }, 200);
});
// 更新DOM
function updateBar({ bars, index, arr }) {
    for (let i of index) {
        bars[i].style.height = (arr[i] / maxVal) * containerHeight + "px";
    }
}
// 交换DOM
function swapDOM(container, i, j) {
    let bars = container.children;

    let node1 = bars[i];
    let node2 = bars[j];

    let next1 = node1.nextSibling;
    let next2 = node2.nextSibling;

    container.insertBefore(node2, next1);
    container.insertBefore(node1, next2);
}
// 请求状态
function applyStatus(step, elements) {
    elements.forEach((el) => {
        if (Status[step.stepType]) {
            Status[step.stepType]({ el, step });
        }
    });
}
// 清除临时状态
function clearTransientStatus(container) {
    Array.from(getBars(container)).forEach((bar) => {
        bar.classList.remove(...TRANSIENT_CLASSES);
    });
}

// 初始化插入排序dom
function initInsertionBars(arr, container) {
    const runtimeArr = [...arr, 0]; // 末尾追加 tmp 槽
    initBars(runtimeArr, container);
    return runtimeArr;
}

// ----------动画引擎----------
// 清除动画
function normalizeBarStyles(container) {
    Array.from(getBars(container)).forEach((bar) => {
        bar.style.transform = "";
        bar.style.transition = "";
        bar.classList.remove("swapping");
    });
}
// flip动画

// 交换flip
async function flipSwap(container, i, j) {
    const bars = container.children;
    const el1 = bars[i];
    const el2 = bars[j];

    if (!el1 || !el2) return;

    const liftY = 24;
    const moveDuration = Math.max(220, time * 0.8);
    const dropDuration = 180;

    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();

    el1.classList.add("swapping");
    el2.classList.add("swapping");

    el1.style.transition = `transform ${dropDuration}ms ease`;
    el2.style.transition = `transform ${dropDuration}ms ease`;

    el1.style.transform = `translateY(-${liftY}px)`;
    el2.style.transform = `translateY(-${liftY}px)`;

    await new Promise((resolve) => setTimeout(resolve, dropDuration));

    swapDOM(container, i, j);

    const newBars = container.children;
    const newEl1 = newBars[j];
    const newEl2 = newBars[i];

    const newRect1 = newEl1.getBoundingClientRect();
    const newRect2 = newEl2.getBoundingClientRect();

    const dx1 = rect1.left - newRect1.left;
    const dx2 = rect2.left - newRect2.left;

    newEl1.style.transition = "none";
    newEl2.style.transition = "none";

    newEl1.style.transform = `translate(${dx1}px, -${liftY}px)`;
    newEl2.style.transform = `translate(${dx2}px, -${liftY}px)`;

    newEl1.offsetHeight;

    newEl1.style.transition = `transform ${moveDuration}ms ease`;
    newEl2.style.transition = `transform ${moveDuration}ms ease`;

    newEl1.style.transform = `translate(0px, -${liftY}px)`;
    newEl2.style.transform = `translate(0px, -${liftY}px)`;

    await new Promise((resolve) => setTimeout(resolve, moveDuration));

    newEl1.style.transition = `transform ${dropDuration}ms ease`;
    newEl2.style.transition = `transform ${dropDuration}ms ease`;

    newEl1.style.transform = "translate(0px, 0px)";
    newEl2.style.transform = "translate(0px, 0px)";

    await new Promise((resolve) => setTimeout(resolve, dropDuration));

    normalizeBarStyles(container);
}
// 重新排序fliP
async function flipReorder(container, mutate, context = {}) {
    const bars = Array.from(getBars(container));
    const firstRects = new Map(
        bars.map((bar) => [bar, bar.getBoundingClientRect()]),
    );

    mutate();

    const newBars = Array.from(getBars(container));
    const moveDuration = Math.max(220, time * 0.8);
    const liftY = context.liftY || 30;

    newBars.forEach((bar) => {
        const first = firstRects.get(bar);
        const last = bar.getBoundingClientRect();
        if (!first || !last) return;

        const dx = first.left - last.left;
        const isFloating = bar === context.floatingBar;
        const y = isFloating ? -liftY : 0;

        bar.style.transition = "none";
        bar.style.transform = `translate(${dx}px, ${y}px)`;
    });

    container.offsetHeight;

    newBars.forEach((bar) => {
        const isFloating = bar === context.floatingBar;
        const y = isFloating ? -liftY : 0;

        bar.style.transition = `transform ${moveDuration}ms ease`;
        bar.style.transform = `translate(0px, ${y}px)`;
    });

    await sleep(moveDuration);
}
// 添加步骤
function createStepAdder(steps, type, container) {
    return function addStep(stepType, indices, add = "active", role = "") {
        steps.push({
            stepType,
            indices,
            type,
            container,
            add,
            role,
        });
    };
}

// 执行步骤
async function runSteps(container, steps, runtimeArr) {
    const bars = Array.from(getBars(container));

    let context = {
        currentSelectedIndex: null,
        currentTmpIndex: null,
        floatingIndex: null,
        floatingBar: null,
        tmpBar: steps[0]?.type === "insertion" ? bars[bars.length - 1] : null,
        runtimeArr,
        liftY: 30,
    };

    for (let step of steps) {
        if (step.type === "selection" && step.stepType === "select") {
            context.currentSelectedIndex = step.indices[0];
        }

        if (step.type === "insertion" && step.stepType === "tmp") {
            context.currentTmpIndex = step.indices[0];
        }

        if (step.add === "active") {
            await Active[step.stepType]({
                container,
                runtimeArr,
                step,
                context,
            });

            if (
                step.type === "selection" &&
                step.stepType === "swap" &&
                context.currentSelectedIndex === step.indices[1]
            ) {
                context.currentSelectedIndex = step.indices[0];
            }

            if (step.type === "insertion" && step.stepType === "insert") {
                context.floatingIndex = null;
            }
        } else {
            await animate(container, step, context);
        }

        if (
            step.type === "selection" &&
            step.stepType === "sorted" &&
            step.indices[0] === context.currentSelectedIndex
        ) {
            context.currentSelectedIndex = null;
        }
    }

    normalizeBarStyles(container);
    clearTransientStatus(container);
}
// 动画实现
async function animate(container, step, context = {}) {
    clearTransientStatus(container);

    const bars = getBars(container);
    const elements = step.indices.map((i) => bars[i]).filter(Boolean);

    applyStatus(step, elements);

    // 选择排序：补回当前最小值高亮
    if (
        step.type === "selection" &&
        context.currentSelectedIndex !== null &&
        bars[context.currentSelectedIndex]
    ) {
        bars[context.currentSelectedIndex].classList.add("select");
    }

    // 插入排序：真实 tmpBar 始终保持 tmp 样式
    if (
        step.type === "insertion" &&
        context.tmpBar &&
        context.tmpBar.isConnected
    ) {
        context.tmpBar.classList.add("tmp");
    }

    // 插入排序：真实 floatingBar 始终保持 select 样式
    if (
        step.type === "insertion" &&
        context.floatingBar &&
        context.floatingBar.isConnected
    ) {
        context.floatingBar.classList.add("select");
    }

    await delay();
}

// ----------排序算法----------
// 冒泡排序
async function bubbleSort(arr, container, type = "bubble") {
    const steps = [];
    const addStep = createStepAdder(steps, type, container);
    for (let i = 0; i < arr.length; i++) {
        let swap = false;
        for (let j = 0; j < arr.length - 1 - i; j++) {
            addStep("compare", [j, j + 1], "status");
            if (arr[j] > arr[j + 1]) {
                addStep("swapHighlight", [j, j + 1], "status");
                // 交换
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                swap = true;
                addStep("swap", [j, j + 1], "active");
            }
        }
        addStep("sorted", [arr.length - i - 1], "status");
        if (!swap) {
            for (let j = arr.length - 1 - i; j >= 0; j--) {
                addStep("sorted", [j], "status");
            }
            break;
        }
    }
    return steps;
}
// 插入排序
// 插入排序：三区模型 + 真实 tmpBar
async function insertSort(arr, container, type = "insertion") {
    const steps = [];
    const addStep = createStepAdder(steps, type, container);

    // arr 形态：[真实数据..., 0]
    const dataLen = arr.length - 1;
    const bufferIndex = arr.length - 1;

    // 真实排序数据，不包含最后的 0 占位柱
    const data = arr.slice(0, dataLen);

    // 初始 tmpBar 在末尾 buffer 区
    addStep("tmp", [bufferIndex], "status");

    for (let i = 1; i < dataLen; i++) {
        const key = data[i];
        let j = i - 1;
        let holeIndex = i;

        // 1. 拿起 index 处元素
        addStep("pick", [i], "active");

        // 2. 移到 n 处暂存区
        addStep("move", [i, bufferIndex], "active", "toBuffer");

        // 3. 原 index 处由 tmpBar 占住，形成空位
        addStep("tmp", [holeIndex], "status");

        // 4. 比 key 大的元素依次右移到当前空位
        while (j >= 0 && data[j] > key) {
            addStep("compare", [j, bufferIndex], "status");
            addStep("move", [j, holeIndex], "active", "shift");

            data[j + 1] = data[j];
            holeIndex = j;

            addStep("tmp", [holeIndex], "status");
            j--;
        }

        // 5. n 处 key 回插到最终空位
        addStep("move", [bufferIndex, holeIndex], "active", "insertBack");
        addStep("insert", [holeIndex], "active");

        data[holeIndex] = key;

        // 6. tmpBar 回到 buffer 区
        addStep("tmp", [bufferIndex], "status");

        // 7. 已排序区高亮
        for (let k = 0; k <= i; k++) {
            addStep("sorted", [k], "status");
        }
    }

    return steps;
}
// 选择排序
async function selectSort(arr, container, type = "selection") {
    let steps = [];
    for (let i = 0; i < arr.length; i++) {
        let minIndex = i;
        let step = {
            stepType: "select",
            indices: [minIndex],
            type: type,
            container: container,
            add: "status",
        };
        steps.push(step);
        for (let j = i + 1; j < arr.length; j++) {
            step = {
                stepType: "compare",
                indices: [minIndex, j],
                type: type,
                container: container,
                add: "status",
            };
            steps.push(step);
            if (arr[j] < arr[minIndex]) {
                minIndex = j;
                step = {
                    stepType: "select",
                    indices: [minIndex],
                    type: type,
                    container: container,
                    add: "status",
                };
                steps.push(step);
            }
        }
        if (minIndex !== i) {
            steps.push({
                stepType: "swapHighlight",
                indices: [i, minIndex],
                container: container,
                type: type,
                add: "status",
            });
            [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
            steps.push({
                stepType: "swap",
                indices: [i, minIndex],
                container: container,
                type: type,
                add: "active",
            });
        }
        steps.push({
            stepType: "sorted",
            indices: [i],
            type: type,
            container: container,
            add: "status",
        });
    }
    return steps;
}

// ----------全局控制----------
// 检查暂停
async function checkPaused() {
    if (!isPaused) return;
    await new Promise((resolve) => {
        resumeResolvers.push(resolve);
    });
}
// 延时
async function delay() {
    await checkPaused();
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
// 睡眠函数
function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

// ----------执行算法----------
// 执行排序
document.querySelectorAll(".start").forEach((btn) => {
    btn.onclick = async function () {
        if (isSorting || isComparing) return;
        isSorting = true;

        if (arr.length === 0) {
            alert("请先生成数组");
            isSorting = false;
            return;
        }

        const type = this.dataset.type;
        const section = this.closest("section.sort");
        const container = section.querySelector(".visualization");

        if (type === "insertion") {
            initBars([...arr, 0], container);
        } else {
            initBars(arr, container);
        }

        normalizeBarStyles(container);
        clearTransientStatus(container);

        let arrCopy = type === "insertion" ? [...arr, 0] : [...arr];
        let arrCopy2 = type === "insertion" ? [...arr, 0] : [...arr];

        let steps = await algorithms[type](arrCopy, container);
        await runSteps(container, steps, arrCopy2);

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
        // 触发所有等待的继续函数
        resumeResolvers.forEach((resolve) => resolve());
        resumeResolvers = [];
    };
});

// 算法比较
async function performanceSort(arr, container) {
    const bubblecontainer = document.getElementById("performance-bubble");
    const insertcontainer = document.getElementById("performance-insertion");
    const selectcontainer = document.getElementById("performance-selection");
    const performanceContainer = document.getElementById("performance-chart");
    let arrCopy1 = [...arr];
    let arrCopy2 = [...arr];
    let arrCopy3 = [...arr];

    isComparing = true;
    document.querySelectorAll(".perf-visualization").forEach((container) => {
        initBars(arr, container);
    });

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
    resumeResolvers = [];
    isPaused = false;
    performanceContainer.innerHTML = `
        <p>冒泡排序: ${(t2 - start1).toFixed(2)} ms</p>
        <p>插入排序: ${(t4 - t3).toFixed(2)} ms</p>
        <p>选择排序: ${(t6 - t5).toFixed(2)} ms</p>
    `;
}
