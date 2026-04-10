/* =========================
   01. 打印功能
   ========================= */
function printResume() {
    window.print();
}

/* =========================
   02. 一页投递模式 - 需要临时隐藏的元素
   说明：
   - 这些元素在网页完整版中保留
   - 下载一页版 PDF 时临时隐藏
   - 导出完成后恢复
   ========================= */
const onePageHiddenSelectors = [
    ".hobby",
    ".school",
    ".info ul",
    ".project-links-title",
    ".project-links",
    ".award .timeline:nth-of-type(n + 3)",
];

let hiddenElementsCache = [];

/* =========================
   03. 开启一页投递模式
   说明：
   - 添加 body.one-page-mode
   - 用内联样式强制隐藏指定元素
   - 这种方式比仅靠 CSS 更稳定
   ========================= */
function enableOnePageMode() {
    document.body.classList.add("one-page-mode");
    hiddenElementsCache = [];

    onePageHiddenSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
            hiddenElementsCache.push({
                element: el,
                display: el.style.display,
            });
            el.style.display = "none";
        });
    });
}

/* =========================
   04. 关闭一页投递模式
   说明：
   - 恢复被临时隐藏的元素
   - 移除 body.one-page-mode
   ========================= */
function disableOnePageMode() {
    hiddenElementsCache.forEach(({ element, display }) => {
        element.style.display = display;
    });

    hiddenElementsCache = [];
    document.body.classList.remove("one-page-mode");
}

/* =========================
   05. 下载一页版 PDF
   说明：
   - 下载前开启一页模式
   - 等待样式与布局稳定后导出
   - 导出后恢复页面
   ========================= */
async function downloadPDF() {
    const element = document.querySelector(".resume");

    enableOnePageMode();

    // 等待样式重排与 DOM 更新
    await new Promise((resolve) => setTimeout(resolve, 300));

    const opt = {
        margin: [4, 4, 4, 4],
        filename: "李谦-前端简历-一页版.pdf",
        image: {
            type: "jpeg",
            quality: 0.98,
        },
        html2canvas: {
            scale: 2,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: "#ffffff",
        },
        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
        },
        pagebreak: {
            mode: ["css", "legacy"],
        },
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } finally {
        disableOnePageMode();
    }
}
