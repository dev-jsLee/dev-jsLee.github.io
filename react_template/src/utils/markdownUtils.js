// src/utils/markdownUtils.js
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
  sanitize: false,
  smartLists: true,
  smartypants: true,
});

export const parseMarkdown = (content) => {
  return marked(content);
};

export const extractLinks = (content) => {
  const links = [];
  const regex = /\[\[(.*?)\]\]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return links;
};

export const createWikiLink = (title) => {
  return `[[${title}]]`;
};