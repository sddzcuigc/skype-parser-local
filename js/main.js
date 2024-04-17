"use strict";

// 在页面顶部添加艺术字提示版权信息
function addCopyrightInfo() {
    // 创建一个新的 div 元素
    const copyrightDiv = document.createElement("div");
    
    // 设置 div 的 id，用于样式选择器
    copyrightDiv.id = "copyright-info";

    // 设置 div 的内容为版权信息和开发者信息
    copyrightDiv.textContent = "本软件由宁津公安崔广超开发，未经允许禁止传播";

    // 设置 div 的样式
    copyrightDiv.style.fontFamily = "'Arial Black', sans-serif"; // 设置字体
    copyrightDiv.style.fontSize = "18px"; // 设置字体大小
    copyrightDiv.style.color = "#333"; // 设置字体颜色
    copyrightDiv.style.textAlign = "center"; // 居中显示
    copyrightDiv.style.padding = "10px"; // 添加内边距
    copyrightDiv.style.backgroundColor = "#f3f3f3"; // 背景颜色
    copyrightDiv.style.borderBottom = "1px solid #ccc"; // 底部边框

    // 将版权信息元素添加到 body 的开头
    document.body.insertBefore(copyrightDiv, document.body.firstChild);
}

// 页面加载时调用 addCopyrightInfo 函数
window.addEventListener("DOMContentLoaded", addCopyrightInfo);

// 获取显示名称
function getDisplayName(conversation) {
    return conversation.displayName ? unescapeHtml(conversation.displayName) : removePrefix(conversation.id);
}

// 处理对话点击事件
function handleConversationClick(event) {
    event.preventDefault();
    const convIndex = parseInt(event.target.getAttribute("data-conv"), 10);
    const messagesContainer = document.getElementById("messages");
    messagesContainer.innerHTML = "";
    document.getElementById("selected-conversation-header").textContent = getDisplayName(window.Skype.conversations[convIndex]);

    const conversation = window.Skype.conversations[convIndex];
    if (conversation && conversation.MessageList) {
        const messages = conversation.MessageList;
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message.content) {
                const messageElement = createMessageElement(message);
                messagesContainer.appendChild(messageElement);
            }
        }
    }
}

// 创建消息元素
function createMessageElement(message) {
    const li = document.createElement("li");
    li.className = "message";
    li.setAttribute("id", message.id);

    const messageHeader = document.createElement("div");
    li.appendChild(messageHeader);

    const authorSpan = document.createElement("span");
    authorSpan.className = "author";
    authorSpan.textContent = removePrefix(message.from);
    messageHeader.appendChild(authorSpan);

    const timestampSpan = document.createElement("span");
    timestampSpan.className = "timestamp";
    timestampSpan.textContent = new Date(message.originalarrivaltime).toLocaleString();
    messageHeader.appendChild(timestampSpan);

    const messageBody = document.createElement("div");
    messageBody.className = "message-body";

    if (message.content.includes("Picture")) {
        handleImageMessages(message.content, messageBody);
    } else if (message.content.includes("Video")) {
        handleVideoMessages(message.content, messageBody);
    } else {
        handleLinkMessages(message.content, messageBody);
    }

    li.appendChild(messageBody);
    return li;
}

// 处理图片消息
function handleImageMessages(content, messageBody) {
    const fileNameMatch = content.match(/0[\w-]*/i) || [];
    const extensionMatch = /png|gif|jpeg|jpg|heic|tiff?|bmp|eps|raw/i;
    const fileExtensionMatch = content.match(extensionMatch) || [];

    if (fileNameMatch.length > 0 && fileExtensionMatch.length > 0) {
        const img = document.createElement("img");
        img.className = "lazy-load";
        // 将图片的真实 URL 存储在 data-src 属性中
        img.dataset.src = `media/${fileNameMatch[0]}.1.${fileExtensionMatch[0]}`;
        img.alt = "移动到此处动态加载图片";

        // 使用 Intersection Observer API
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 当图片进入视口时，设置 src 加载图片
                    img.src = img.dataset.src;
                    // 停止观察
                    observer.unobserve(img);
                }
            });
        }, {
            root: null, // 使用浏览器视口作为根
            rootMargin: "0px",
            threshold: 0.1 // 当元素 10% 进入视口时触发
        });

        // 观察图片
        observer.observe(img);

        messageBody.appendChild(img);
    }
}

// 处理视频消息
function handleVideoMessages(content, messageBody) {
    const videoMatch = content.match(/0[\w-]*/i) || [];
    if (videoMatch.length > 0) {
        const videoId = videoMatch[0];
        const videoElement = document.createElement("video");
        videoElement.controls = true;
        videoElement.poster = `media/${videoId}.2.jpeg`;
        
        const sourceElement = document.createElement("source");
        sourceElement.src = `media/${videoId}.1.mp4`;
        sourceElement.type = "video/mp4";
        videoElement.appendChild(sourceElement);

        messageBody.appendChild(videoElement);
    }
}

// 处理链接消息
function handleLinkMessages(content, messageBody) {
    const linkMatch = content.match(/<a href="([^"]+)">([^<]+)<\/a>/);
    if (linkMatch && linkMatch.length === 3) {
        const anchor = document.createElement("a");
        anchor.href = linkMatch[1];
        anchor.textContent = linkMatch[2];
        messageBody.appendChild(anchor);
    } else {
        messageBody.textContent = unescapeHtml(content);
    }
}

// 解码 HTML 实体
function unescapeHtml(html) {
    return html.replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// 移除前缀
function removePrefix(id) {
    return id.replace(/^8:/, "");
}

// 更新步骤的可见性
function toggleStep(stepId, visible) {
    const elements = document.getElementsByClassName(stepId);
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = visible ? "block" : "none";
    }
}

// 处理文件加载
document.getElementById("btnLoad").addEventListener("click", function() {
    const fileInput = document.getElementById("fileinput");
    if (fileInput && fileInput.files) {
        const file = fileInput.files[0];
        if (file) {
            document.getElementById("progress").style.display = "block";
            const fileReader = new FileReader();
            fileReader.onload = function(event) {
                const fileContent = event.target.result;
                try {
                    const skypeData = JSON.parse(fileContent);
                    processSkypeData(skypeData);
                } catch (error) {
                    alert("无法加载文件。请确保文件格式正确。");
                }
            };
            fileReader.readAsText(file, "utf8");
        } else {
            alert("请选择文件后再点击“加载”。");
        }
    } else {
        alert("当前浏览器不支持文件输入，请使用现代浏览器。");
    }
});

// 处理 Skype 数据
function processSkypeData(skypeData) {
    if (skypeData && skypeData.userId && skypeData.conversations && skypeData.exportDate) {
        const exportDate = new Date(skypeData.exportDate);
        const conversations = skypeData.conversations.filter(conv => conv.id && conv.MessageList && conv.MessageList.length);

        updateHeader("hdr-user", removePrefix(skypeData.userId));
        updateHeader("hdr-exported", exportDate.toLocaleString());
        updateHeader("hdr-stats", `${conversations.length} conversations`);

        renderConversations(conversations);
        window.Skype = { conversations };
        
        toggleStep("step-1", false);
        toggleStep("step-2", true);
    } else {
        alert("无法加载数据。请确保文件格式正确。");
    }
}

// 更新头部
function updateHeader(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// 渲染对话
function renderConversations(conversations) {
    const conversationList = document.getElementById("conversations");
    if (conversationList) {
        conversationList.innerHTML = "";
        conversations.forEach((conv, index) => {
            const listItem = document.createElement("li");
            listItem.className = "conversations";

            const link = document.createElement("a");
            link.href = "#";
            link.setAttribute("data-conv", index);
            link.className = "conv-link";
            link.textContent = getDisplayName(conv);
            link.addEventListener("click", handleConversationClick);

            listItem.appendChild(link);
            conversationList.appendChild(listItem);
        });
    }
}
// 初始化步骤切换
toggleStep("step-2", false);
toggleStep("step-1", true);