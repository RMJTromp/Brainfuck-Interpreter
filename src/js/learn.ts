const colorizeBF = (input: string) => {
    return input.replaceAll(/(<)(?![a\/])/g, `&lt;`)
        .replaceAll(/(?<!["a])(>)/g, `&gt;`)
        .replaceAll(/((?:&lt;)+)/g, `<span operator="<">$1</span>`)
        .replaceAll(/((?:&gt;)+)/g, `<span operator=">">$1</span>`)
        .replaceAll(/(\++)/g, `<span operator="+">$1</span>`)
        .replaceAll(/(-+)/g, `<span operator="-">$1</span>`)
        .replaceAll(/(\.+)/g, `<span operator=".">$1</span>`)
        .replaceAll(/(,+)/g, `<span operator=",">$1</span>`)
        .replaceAll(/(\[)/g, `<span operator="[">$1</span>`)
        .replaceAll(/(])/g, `<span operator="]">$1</span>`)
}

document.addEventListener("DOMContentLoaded", () => {
    const article = document.querySelector("article.learn");
    if(!article) return;

    // Colorize all code blocks
    article.querySelectorAll("pre > code").forEach(code => {
        code.innerHTML = colorizeBF(code.textContent ?? "");
    });

    // Wrap each <pre> with data-bf in a .code-block wrapper and add "Try it out" button
    article.querySelectorAll("pre[data-bf]").forEach(pre => {
        const bf = pre.getAttribute("data-bf");
        if(!bf) return;

        const wrapper = document.createElement("div");
        wrapper.className = "code-block";

        const link = document.createElement("a");
        link.className = "primary";
        link.href = `/#${encodeURIComponent(bf)}`;
        link.textContent = "Try it out \u2192";

        pre.parentNode!.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(link);
    });
});
