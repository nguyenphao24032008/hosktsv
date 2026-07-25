import { useEffect } from 'react';
import http from '@/api/http';

export default () => {
    useEffect(() => {
        http.get('/api/client/extensions/blueserverproperties/settings/nav-text')
            .then(response => {
                const text = response.data.text || 'Server Properties';
                const navLinks = document.querySelectorAll('a[href*="/servercfg"]');
                navLinks.forEach(link => {
                    const textNode = Array.from(link.childNodes).find(
                        node => node.nodeType === Node.TEXT_NODE
                    );
                    if (textNode) {
                        textNode.textContent = text;
                    }
                });
            })
            .catch(() => {});
    }, []);

    return null;
};

