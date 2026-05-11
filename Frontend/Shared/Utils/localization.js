
(function() {
    /**
     * QuadStock Localization Service
     * Handles dynamic translations, date and time formatting.
     */
    class LocalizationService {
        constructor() {
            this.settings = {
                language: localStorage.getItem('language') || 'en',
                dateFormat: localStorage.getItem('dateFormat') || 'dd-mm-yyyy',
                timeFormat: localStorage.getItem('timeFormat') || '12'
            };
            this.translations = {
                hi: {
                    // Dashboard & Stats
                    "Dashboard": "डैशबोर्ड",
                    "Total Revenue": "कुल राजस्व",
                    "Total Sales": "कुल बिक्री",
                    "Stock Out": "स्टॉक खत्म",
                    "Low Stock": "कम स्टॉक",
                    "Expiring Soon": "जल्द समाप्त",
                    "Weekly Revenue": "साप्ताहिक राजस्व",
                    "Monthly Revenue": "मासिक राजस्व",
                    "Recent Sales": "हालिया बिक्री",
                    "Top Products": "बेहतरीन उत्पाद",
                    "View All": "सभी देखें",
                    "This Week's Revenue": "इस सप्ताह का राजस्व",
                    "Revenue Split": "राजस्व विभाजन",
                    
                    // Sidebar Nav
                    "Sales POS": "बिक्री (POS)",
                    "Inventory": "इन्वेंट्री",
                    "Customers": "ग्राहक",
                    "Staff": "स्टाफ",
                    "Settings": "सेटिंग्स",
                    "Logout": "लॉगआउट",
                    "Billing Counter": "बिलिंग काउंटर",
                    "Stock Management": "स्टॉक मैनेजमेंट",
                    "Analytics": "एनालिटिक्स",
                    "Queries": "पूछताछ",
                    "Complaints": "शिकायतें",
                    "Udhaar": "उधार",
                    "Smart Expiry": "स्मार्ट एक्सपायरी",
                    "POS Terminal": "पीओएस टर्मिनल",
                    
                    // Forms & Buttons
                    "Profile": "प्रोफाइल",
                    "Business Preferences": "व्यापार प्राथमिकताएं",
                    "Notifications": "सूचनाएं",
                    "Localization": "स्थानीयकरण",
                    "Security": "सुरक्षा",
                    "Update Region": "क्षेत्र अपडेट करें",
                    "Save Profile": "प्रोफाइल सेव करें",
                    "Shop Name": "दुकान का नाम",
                    "Owner Name": "मालिक का नाम",
                    "Save Changes": "बदलाव सेव करें",
                    "Cancel": "रद्द करें",
                    "Confirm": "पुष्टि करें",
                    "Success": "सफलता",
                    "Error": "त्रुटि",
                    "Warning": "चेतावनी",
                    "Loading": "लोड हो रहा है...",
                    "Search": "खोजें",
                    "Contact Info": "संपर्क जानकारी",
                    "GST Number": "GST नंबर",
                    "Store Address": "स्टोर का पता",
                    "Store Email": "स्टोर ईमेल",
                    "UPI ID": "UPI आईडी",
                    "Store Terms": "स्टोर के नियम",
                    "Default Tax (%)": "डिफ़ॉल्ट टैक्स (%)",
                    "Low Stock Threshold": "लो स्टॉक सीमा",
                    "App Language": "ऐप की भाषा",
                    "Date Format": "तारीख का फॉर्मेट",
                    "Time Format": "समय का फॉर्मेट",
                    
                    // POS Specific
                    "Add Product": "उत्पाद जोड़ें",
                    "Grand Total": "कुल राशि",
                    "Tax": "टैक्स",
                    "Discount": "छूट",
                    "Checkout": "चेकआउट",
                    "Print Bill": "बिल प्रिंट करें",
                    "Customer Name": "ग्राहक का नाम",
                    "Customer Phone": "ग्राहक का फोन",
                    "Payment Method": "भुगतान का तरीका",
                    "Cash": "नकद",
                    "Online": "ऑनलाइन",
                    "Udhaar": "उधार",
                    
                    // Table Headers
                    "Product Name": "उत्पाद का नाम",
                    "Category": "कैटेगरी",
                    "Price": "कीमत",
                    "Quantity": "मात्रा",
                    "Expiry Date": "समाप्ति तिथि",
                    "Action": "कार्रवाई",
                    "Edit": "एडिट",
                    "Delete": "डिलीट",
                    "Inventory Value": "इन्वेंट्री मूल्य"
                }
            };
        }

        async init() {
            // Update settings from localStorage
            this.settings.language = localStorage.getItem('language') || 'en';
            this.settings.dateFormat = localStorage.getItem('dateFormat') || 'dd-mm-yyyy';
            this.settings.timeFormat = localStorage.getItem('timeFormat') || '12';
            
            // Auto-apply translations once DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.applyTranslations());
            } else {
                this.applyTranslations();
            }
        }

        translate(key) {
            const lang = this.settings.language;
            if (lang === 'hi' && this.translations.hi[key]) {
                return this.translations.hi[key];
            }
            return key;
        }

        setLanguage(lang) {
            this.settings.language = lang;
            localStorage.setItem('language', lang);
            this.applyTranslations();
            // Trigger storage event for other tabs
            window.dispatchEvent(new Event('storage'));
        }

        formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();

            if (this.settings.dateFormat === 'mm-dd-yyyy') {
                return `${month}-${day}-${year}`;
            }
            return `${day}-${month}-${year}`;
        }

        formatTime(date) {
            if (!date) return '';
            const d = new Date(date);
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            
            if (this.settings.timeFormat === '24') {
                return `${String(hours).padStart(2, '0')}:${minutes}`;
            } else {
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${hours}:${minutes} ${ampm}`;
            }
        }

        applyTranslations() {
            const lang = this.settings.language;
            console.log(`[LocService] Applying ${lang} translations...`);
            
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                let translated = key;
                
                if (lang === 'hi' && this.translations.hi[key]) {
                    translated = this.translations.hi[key];
                }

                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translated;
                } else if (el.classList.contains('translate-title')) {
                    el.title = translated;
                } else {
                    // Preserve icon if any
                    const icon = el.querySelector('i');
                    if (icon) {
                        // Find the text node and update it
                        let textNode = Array.from(el.childNodes).find(node => node.nodeType === 3);
                        if (textNode) {
                            textNode.textContent = ' ' + translated;
                        } else {
                            el.appendChild(document.createTextNode(' ' + translated));
                        }
                    } else {
                        el.innerText = translated;
                    }
                }
            });
        }
    }

    // Attach to window
    window.LocService = new LocalizationService();
    window.LocService.init();
})();
