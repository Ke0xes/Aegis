const START_YEAR = 2024;
const END_YEAR = 2040;
const YEARS_TO_PROJECT = END_YEAR - START_YEAR + 1;

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.checked = true;
    document.getElementById('currentThemeLabel').textContent = 'Dark Theme';
    document.body.classList.add('professional-theme');
    
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('professional-theme', themeToggle.checked);
        document.getElementById('currentThemeLabel').textContent = themeToggle.checked ? 'Dark Theme' : 'Classic Theme';
    });

    // Setup all handlers and initialize components
    setupDecimalHandling();
    setupEventHandlers();
    initializeCalculations();

    // Setup mode toggles
    document.querySelectorAll('.toggle-input-mode').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const category = this.dataset.category;
            const yearly = this.checked;
            toggleInputMode(category, yearly);
        });
    });
});

function setupEventHandlers() {
    // Set up investment model handlers
    document.getElementById('inflationRate').addEventListener('change', calculateInvestmentBreakdown);
    document.getElementById('yearSlider').addEventListener('change', calculateInvestmentBreakdown);
    
    // Set up country selector handler
    const countrySelector = document.getElementById('countrySelector');
    if (countrySelector) {
        countrySelector.addEventListener('change', updateGdpByCountry);
    }
    
    // Set up all utilization and investment handlers
    document.querySelectorAll([
        '#utilizationPeople', '#utilizationProcess', '#utilizationTechnology',
        '#peopleCapex', '#peopleOpex', '#peopleRecCapex', '#peopleIncOpex',
        '#processCapex', '#processOpex', '#processRecCapex', '#processIncOpex',
        '#techCapex', '#techOpex', '#techRecCapex', '#techIncOpex'
    ].join(',')).forEach(el => el.addEventListener('change', calculateInvestmentBreakdown));
}

// Initialize all calculations
function initializeCalculations() {
    calculateModel();
    setupInfoIcons();
    updateConflictWarnings(); // Check for conflicts on page load
    updateGdpInWords();
    
    // Initialize budget utilization view (default to CDC)
    document.getElementById('cdcViewBtn').classList.add('active');
    
    calculateInvestmentBreakdown();
    
    // Set up year slider to update labels
    const yearSlider = document.getElementById('yearSlider');
    yearSlider.addEventListener('input', () => {
        const selectedYear = yearSlider.value;
        document.getElementById('sliderYearLabel').textContent = selectedYear;
    });
}

// Setup decimal place handling for numeric inputs
function setupDecimalHandling() {
    const decimalInputs = [
        'nationalGdpGrowthRate',
        'militaryGdpAllocation',
        'overallCyberActivitiesApportionment'
    ];
    
    function formatValue(input) {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            // Store the formatted value with 2 decimal places
            input.setAttribute('data-value', value.toFixed(2));
            input.value = value.toFixed(2);
        }
    }
    
    decimalInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Format on load
            formatValue(input);
            
            // Format on change
            input.addEventListener('change', (e) => {
                formatValue(e.target);
            });
            
            // Store the original value when focusing
            input.addEventListener('focus', (e) => {
                const storedValue = e.target.getAttribute('data-value');
                if (storedValue) {
                    e.target.value = storedValue;
                }
            });
            
            // Restore the formatted value when leaving the field
            input.addEventListener('blur', (e) => {
                formatValue(e.target);
            });
        }
    });
}

function numberToWords(num) {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const scales = ['', 'thousand', 'million', 'billion', 'trillion'];

    function processTriplet(triplet) {
        let result = '';
        if (triplet >= 100) {
            result += ones[Math.floor(triplet / 100)] + ' hundred ';
            triplet %= 100;
            if (triplet > 0) result += 'and ';
        }
        if (triplet >= 20) {
            result += tens[Math.floor(triplet / 10)] + ' ';
            if (triplet % 10 > 0) result += ones[triplet % 10] + ' ';
        } else if (triplet >= 10) {
            result += teens[triplet - 10] + ' ';
        } else if (triplet > 0) {
            result += ones[triplet] + ' ';
        }
        return result;
    }

    if (num === 0) return 'zero';
    
    let result = '';
    let scaleIndex = 0;
    
    while (num > 0) {
        const triplet = num % 1000;
        if (triplet > 0) {
            result = processTriplet(triplet) + scales[scaleIndex] + ' ' + result;
        }
        scaleIndex++;
        num = Math.floor(num / 1000);
    }
    
    return result.trim() + ' US dollars';
}

function applyGdpPresetModel(type) {
    // GDP growth scenarios
    const scenarios = {
        robust: {  // Strong Recovery & Innovation-Led Growth
            2024: 0.8, 2025: 1.4, 2026: 2.1, 2027: 3.2, 2028: 3.8,
            2029: 3.5, 2030: 2.9, 2031: 2.2, 2032: 2.6, 2033: 3.1,
            2034: 3.4, 2035: 2.8, 2036: 2.1, 2037: 2.5, 2038: 2.7,
            2039: 2.3, 2040: 2.6
        },
        moderate: {  // Steady Nordic Model Growth
            2024: 0.8, 2025: 1.1, 2026: 1.8, 2027: 2.3, 2028: 2.6,
            2029: 2.1, 2030: 1.7, 2031: 1.9, 2032: 2.2, 2033: 2.4,
            2034: 2.3, 2035: 2.0, 2036: 1.8, 2037: 2.1, 2038: 2.2,
            2039: 2.0, 2040: 2.1
        },
        cautious: {  // Constrained Growth with Headwinds
            2024: 0.8, 2025: 0.9, 2026: 1.2, 2027: 1.6, 2028: 1.9,
            2029: 1.5, 2030: 0.8, 2031: 1.1, 2032: 1.4, 2033: 1.7,
            2034: 1.6, 2035: 1.2, 2036: 1.0, 2037: 1.3, 2038: 1.5,
            2039: 1.4, 2040: 1.3
        }
    };

    // Enable variable rate mode
    const toggle = document.getElementById('gdpGrowthModeToggle');
    toggle.checked = true;
    toggleInputMode('gdpGrowth', true);

    // DON'T overwrite the fixed rate input - preserve user's original value
    // Only set the yearly values for variable mode

    // Set values for each year
    for (let year = START_YEAR; year <= END_YEAR; year++) {
        const yearInput = document.getElementById(`gdpGrowth${year}`);
        if (yearInput) {
            yearInput.value = parseFloat(scenarios[type][year]).toFixed(2);
        }
    }

    // Common disclaimer text
    const disclaimerText = "DISCLAIMER: This is a theoretical example and not to be taken as fact-based forecasting.";
    
    // Update source text with just the disclaimer
    document.getElementById('nationalGdpGrowthRateSource').value = disclaimerText;

    // Recalculate the model
    calculateModel();
}

function applyMilitarySpendPreset(type) {
    // Military spending scenarios
    const scenarios = {
        conservative: {
            baseValue: 2.04,
            name: 'EU Defense Model',
            yearlyRates: {
                2024: 2.04, 2025: 2.04, 2026: 2.04, 2027: 2.04, 2028: 2.04,
                2029: 2.04, 2030: 2.04, 2031: 2.04, 2032: 2.04, 2033: 2.04,
                2034: 2.04, 2035: 2.04, 2036: 2.04, 2037: 2.04, 2038: 2.04,
                2039: 2.04, 2040: 2.04
            }
        },
        balanced: {
            baseValue: 2.30,
            name: 'Nordic Defense Model',
            yearlyRates: {
                2024: 2.30, 2025: 2.30, 2026: 2.30, 2027: 2.30, 2028: 2.30,
                2029: 2.30, 2030: 2.30, 2031: 2.30, 2032: 2.30, 2033: 2.30,
                2034: 2.30, 2035: 2.30, 2036: 2.30, 2037: 2.30, 2038: 2.30,
                2039: 2.30, 2040: 2.30
            }
        },
        committed: {
            baseValue: 2.20,
            name: 'NATO Defense Model',
            yearlyRates: {
                2024: 2.14, 2025: 2.40, 2026: 2.40, 2027: 2.50, 2028: 2.60,
                2029: 2.60, 2030: 3.50, 2031: 3.50, 2032: 3.50, 2033: 3.50,
                2034: 3.50, 2035: 5.00, 2036: 5.00, 2037: 5.00, 2038: 5.00,
                2039: 5.00, 2040: 5.00
            }
        }
    };

    // Enable variable rate mode
    const toggle = document.getElementById('militaryAllocModeToggle');
    toggle.checked = true;
    toggleInputMode('militaryAllocation', true);

    // DON'T overwrite the fixed rate input - preserve user's original value
    // Only set the yearly values for variable mode
    
    // Make sure yearly inputs are created and visible
    const container = document.getElementById('yearlyMilitaryAllocationInputsContainer');
    if (!container.querySelector('.yearly-input-item')) {
        createYearlyInputs('militaryAllocation', 'yearlyMilitaryAllocationInputsContainer', 'militaryGdpAllocation');
    }
    
    // Set values for each year
    for (let year = START_YEAR; year <= END_YEAR; year++) {
        const yearInput = document.getElementById(`militaryAllocation${year}`);
        if (yearInput) {
            yearInput.value = scenarios[type].yearlyRates[year].toFixed(2);
        }
    }
    
    // Set the source text
    document.getElementById('militaryGdpAllocationSource').value = 
        `${scenarios[type].name} - DISCLAIMER: This is a theoretical example and not to be taken as fact-based forecasting.`;
    
    // Recalculate the model
    calculateModel();
}

function applyPresetModel(type) {
    // Enable variable rate mode
    const toggle = document.getElementById('overallCyberActivitiesApportionmentModeToggle');
    toggle.checked = true;
    toggleInputMode('overallCyberActivitiesApportionment', true);

    // Get base value
    const baseValue = parseFloat(document.getElementById('overallCyberActivitiesApportionment').value);
    const increment = type === 'low' ? 0.25 : type === 'medium' ? 0.50 : 0.75;

    // Set values for each year with incremental growth
    for (let year = START_YEAR; year <= END_YEAR; year++) {
        const yearInput = document.getElementById(`overallCyberActivitiesApportionment${year}`);
        if (yearInput) {
            const yearIndex = year - START_YEAR;
            const value = baseValue + (increment * yearIndex);
            yearInput.value = value.toFixed(2);
        }
    }

    // Recalculate the model
    calculateModel();
}

function updateGdpInWords() {
    const gdpInput = document.getElementById('nationalGdp');
    const gdpWordsDiv = document.getElementById('gdpInWords');
    if (gdpInput && gdpWordsDiv) {
        const value = parseFloat(gdpInput.value);
        if (!isNaN(value)) {
            gdpWordsDiv.textContent = numberToWords(Math.round(value));
        } else {
            gdpWordsDiv.textContent = '';
        }
    }
}

// Comprehensive Country GDP mapping based on World Bank/IMF 2024 data (in USD)
const COUNTRY_GDP_DATA = {
    'US': { gdp: 27720700000000, name: 'United States', currency: 'USD' },
    'CN': { gdp: 17794800000000, name: 'China', currency: 'CNY' },
    'DE': { gdp: 4525700000000, name: 'Germany', currency: 'EUR' },
    'JP': { gdp: 4204490000000, name: 'Japan', currency: 'JPY' },
    'IN': { gdp: 3567550000000, name: 'India', currency: 'INR' },
    'GB': { gdp: 3380850000000, name: 'United Kingdom', currency: 'GBP' },
    'FR': { gdp: 3051830000000, name: 'France', currency: 'EUR' },
    'IT': { gdp: 2300940000000, name: 'Italy', currency: 'EUR' },
    'BR': { gdp: 2173670000000, name: 'Brazil', currency: 'BRL' },
    'CA': { gdp: 2142470000000, name: 'Canada', currency: 'CAD' },
    'RU': { gdp: 2021420000000, name: 'Russia', currency: 'RUB' },
    'MX': { gdp: 1789110000000, name: 'Mexico', currency: 'MXN' },
    'AU': { gdp: 1728060000000, name: 'Australia', currency: 'AUD' },
    'KR': { gdp: 1712790000000, name: 'South Korea', currency: 'KRW' },
    'ES': { gdp: 1620090000000, name: 'Spain', currency: 'EUR' },
    'ID': { gdp: 1371170000000, name: 'Indonesia', currency: 'IDR' },
    'NL': { gdp: 1154360000000, name: 'Netherlands', currency: 'EUR' },
    'TR': { gdp: 1118250000000, name: 'Turkey', currency: 'TRY' },
    'SA': { gdp: 1067580000000, name: 'Saudi Arabia', currency: 'SAR' },
    'CH': { gdp: 884940000000, name: 'Switzerland', currency: 'CHF' },
    'PL': { gdp: 809201000000, name: 'Poland', currency: 'PLN' },
    'AR': { gdp: 646075000000, name: 'Argentina', currency: 'ARS' },
    'BE': { gdp: 644783000000, name: 'Belgium', currency: 'EUR' },
    'SE': { gdp: 584960000000, name: 'Sweden', currency: 'SEK' },
    'IE': { gdp: 551395000000, name: 'Ireland', currency: 'EUR' },
    'TH': { gdp: 514969000000, name: 'Thailand', currency: 'THB' },
    'AE': { gdp: 514130000000, name: 'United Arab Emirates', currency: 'AED' },
    'IL': { gdp: 513611000000, name: 'Israel', currency: 'ILS' },
    'AT': { gdp: 511685000000, name: 'Austria', currency: 'EUR' },
    'SG': { gdp: 501428000000, name: 'Singapore', currency: 'SGD' },
    'NO': { gdp: 485311000000, name: 'Norway', currency: 'NOK' },
    'BD': { gdp: 437415000000, name: 'Bangladesh', currency: 'BDT' },
    'PH': { gdp: 437146000000, name: 'Philippines', currency: 'PHP' },
    'VN': { gdp: 429717000000, name: 'Vietnam', currency: 'VND' },
    'DK': { gdp: 407092000000, name: 'Denmark', currency: 'DKK' },
    'IR': { gdp: 404626000000, name: 'Iran', currency: 'IRR' },
    'MY': { gdp: 399705000000, name: 'Malaysia', currency: 'MYR' },
    'EG': { gdp: 396002000000, name: 'Egypt', currency: 'EGP' },
    'HK': { gdp: 380812000000, name: 'Hong Kong', currency: 'HKD' },
    'ZA': { gdp: 380699000000, name: 'South Africa', currency: 'ZAR' },
    'NG': { gdp: 363846000000, name: 'Nigeria', currency: 'NGN' },
    'CO': { gdp: 363494000000, name: 'Colombia', currency: 'COP' },
    'RO': { gdp: 350776000000, name: 'Romania', currency: 'RON' },
    'CZ': { gdp: 343208000000, name: 'Czech Republic', currency: 'CZK' },
    'PK': { gdp: 337912000000, name: 'Pakistan', currency: 'PKR' },
    'CL': { gdp: 335533000000, name: 'Chile', currency: 'CLP' },
    'FI': { gdp: 295532000000, name: 'Finland', currency: 'EUR' },
    'PT': { gdp: 289114000000, name: 'Portugal', currency: 'EUR' },
    'PE': { gdp: 267603000000, name: 'Peru', currency: 'PEN' },
    'KZ': { gdp: 262642000000, name: 'Kazakhstan', currency: 'KZT' },
    'NZ': { gdp: 252176000000, name: 'New Zealand', currency: 'NZD' },
    'IQ': { gdp: 250843000000, name: 'Iraq', currency: 'IQD' },
    'DZ': { gdp: 247626000000, name: 'Algeria', currency: 'DZD' },
    'GR': { gdp: 243498000000, name: 'Greece', currency: 'EUR' },
    'QA': { gdp: 213003000000, name: 'Qatar', currency: 'QAR' },
    'HU': { gdp: 212389000000, name: 'Hungary', currency: 'HUF' },
    'UA': { gdp: 178757000000, name: 'Ukraine', currency: 'UAH' },
    'KW': { gdp: 163705000000, name: 'Kuwait', currency: 'KWD' },
    'ET': { gdp: 163698000000, name: 'Ethiopia', currency: 'ETB' },
    'MA': { gdp: 144417000000, name: 'Morocco', currency: 'MAD' },
    'SK': { gdp: 132908000000, name: 'Slovakia', currency: 'EUR' },
    'DO': { gdp: 121444000000, name: 'Dominican Republic', currency: 'DOP' },
    'EC': { gdp: 118845000000, name: 'Ecuador', currency: 'USD' },
    'SD': { gdp: 109266000000, name: 'Sudan', currency: 'SDG' },
    'OM': { gdp: 108811000000, name: 'Oman', currency: 'OMR' },
    'KE': { gdp: 108039000000, name: 'Kenya', currency: 'KES' },
    'GT': { gdp: 104450000000, name: 'Guatemala', currency: 'GTQ' },
    'BG': { gdp: 102408000000, name: 'Bulgaria', currency: 'BGN' },
    'UZ': { gdp: 101592000000, name: 'Uzbekistan', currency: 'UZS' },
    'CR': { gdp: 86497941439, name: 'Costa Rica', currency: 'CRC' },
    'LU': { gdp: 85755006124, name: 'Luxembourg', currency: 'EUR' },
    'AO': { gdp: 84824654482, name: 'Angola', currency: 'AOA' },
    'HR': { gdp: 84393795502, name: 'Croatia', currency: 'HRK' },
    'LK': { gdp: 84356863744, name: 'Sri Lanka', currency: 'LKR' },
    'PA': { gdp: 83318176900, name: 'Panama', currency: 'USD' },
    'RS': { gdp: 81342660752, name: 'Serbia', currency: 'RSD' },
    'LT': { gdp: 79789877416, name: 'Lithuania', currency: 'EUR' },
    'TZ': { gdp: 79062403821, name: 'Tanzania', currency: 'TZS' },
    'CI': { gdp: 78875489245, name: 'Côte d\'Ivoire', currency: 'XOF' },
    'UY': { gdp: 77240830877, name: 'Uruguay', currency: 'UYU' },
    'GH': { gdp: 76370396722, name: 'Ghana', currency: 'GHS' },
    'AZ': { gdp: 72356176471, name: 'Azerbaijan', currency: 'AZN' },
    'BY': { gdp: 71857382746, name: 'Belarus', currency: 'BYN' },
    'SI': { gdp: 69148468417, name: 'Slovenia', currency: 'EUR' },
    'MM': { gdp: 66757619000, name: 'Myanmar', currency: 'MMK' },
    'CD': { gdp: 66383287003, name: 'DR Congo', currency: 'CDF' },
    'TM': { gdp: 60628857143, name: 'Turkmenistan', currency: 'TMT' },
    'JO': { gdp: 0, name: 'Jordan', currency: '' },
    'CM': { gdp: 0, name: 'Cameroon', currency: '' },
    'UG': { gdp: 0, name: 'Uganda', currency: '' },
        'TN': { gdp: 0, name: 'Tunisia', currency: '' },
        'BH': { gdp: 0, name: 'Bahrain', currency: '' },
        'MO': { gdp: 0, name: 'Macao', currency: '' },
        'BO': { gdp: 0, name: 'Bolivia', currency: '' },
        'LY': { gdp: 0, name: 'Libya', currency: '' },
        'PY': { gdp: 0, name: 'Paraguay', currency: '' },
        'KH': { gdp: 0, name: 'Cambodia', currency: '' },
        'LV': { gdp: 0, name: 'Latvia', currency: '' },
        'EE': { gdp: 0, name: 'Estonia', currency: '' },
        'NP': { gdp: 0, name: 'Nepal', currency: '' },
        'ZW': { gdp: 0, name: 'Zimbabwe', currency: '' },
        'HN': { gdp: 0, name: 'Honduras', currency: '' },
        'SV': { gdp: 0, name: 'El Salvador', currency: '' },
        'CY': { gdp: 0, name: 'Cyprus', currency: '' },
        'IS': { gdp: 0, name: 'Iceland', currency: '' },
        'SN': { gdp: 0, name: 'Senegal', currency: '' },
        'GE': { gdp: 0, name: 'Georgia', currency: '' },
        'PG': { gdp: 0, name: 'Papua New Guinea', currency: '' },
        'ZM': { gdp: 0, name: 'Zambia', currency: '' },
        'BA': { gdp: 0, name: 'Bosnia and Herzegovina', currency: '' },
        'TT': { gdp: 0, name: 'Trinidad and Tobago', currency: '' },
        'AM': { gdp: 0, name: 'Armenia', currency: '' },
        'AL': { gdp: 0, name: 'Albania', currency: '' },
        'MT': { gdp: 0, name: 'Malta', currency: '' },
        'GN': { gdp: 0, name: 'Guinea', currency: '' },
        'MZ': { gdp: 0, name: 'Mozambique', currency: '' },
        'ML': { gdp: 0, name: 'Mali', currency: '' },
        'MN': { gdp: 0, name: 'Mongolia', currency: '' },
        'BF': { gdp: 0, name: 'Burkina Faso', currency: '' },
        'HT': { gdp: 0, name: 'Haiti', currency: '' },
        'BJ': { gdp: 0, name: 'Benin', currency: '' },
        'JM': { gdp: 0, name: 'Jamaica', currency: '' },
        'BW': { gdp: 0, name: 'Botswana', currency: '' },
        'GA': { gdp: 0, name: 'Gabon', currency: '' },
        'NI': { gdp: 0, name: 'Nicaragua', currency: '' },
        'PS': { gdp: 0, name: 'Palestine', currency: '' },
        'AF': { gdp: 0, name: 'Afghanistan', currency: '' },
        'GY': { gdp: 0, name: 'Guyana', currency: '' },
        'NE': { gdp: 0, name: 'Niger', currency: '' },
        'MD': { gdp: 0, name: 'Moldova', currency: '' },
        'LA': { gdp: 0, name: 'Laos', currency: '' },
        'MG': { gdp: 0, name: 'Madagascar', currency: '' },
        'MK': { gdp: 0, name: 'North Macedonia', currency: '' },
        'CG': { gdp: 0, name: 'Congo', currency: '' },
        'BN': { gdp: 0, name: 'Brunei', currency: '' },
        'MU': { gdp: 0, name: 'Mauritius', currency: '' },
        'BS': { gdp: 0, name: 'Bahamas', currency: '' },
        'RW': { gdp: 0, name: 'Rwanda', currency: '' },
        'KG': { gdp: 0, name: 'Kyrgyzstan', currency: '' },
        'TD': { gdp: 0, name: 'Chad', currency: '' },
        'MW': { gdp: 0, name: 'Malawi', currency: '' },
        'NA': { gdp: 0, name: 'Namibia', currency: '' },
        'GQ': { gdp: 0, name: 'Equatorial Guinea', currency: '' },
        'TJ': { gdp: 0, name: 'Tajikistan', currency: '' },
        'MR': { gdp: 0, name: 'Mauritania', currency: '' },
        'TG': { gdp: 0, name: 'Togo', currency: '' },
        'ME': { gdp: 0, name: 'Montenegro', currency: '' },
        'BB': { gdp: 0, name: 'Barbados', currency: '' },
        'MV': { gdp: 0, name: 'Maldives', currency: '' },
        'SL': { gdp: 0, name: 'Sierra Leone', currency: '' },
        'FJ': { gdp: 0, name: 'Fiji', currency: '' },
        'SZ': { gdp: 0, name: 'Eswatini', currency: '' },
        'LR': { gdp: 0, name: 'Liberia', currency: '' },
        'AD': { gdp: 0, name: 'Andorra', currency: '' },
        'AW': { gdp: 0, name: 'Aruba', currency: '' },
        'SR': { gdp: 0, name: 'Suriname', currency: '' },
        'BZ': { gdp: 0, name: 'Belize', currency: '' },
        'BI': { gdp: 0, name: 'Burundi', currency: '' },
        'CF': { gdp: 0, name: 'Central African Republic', currency: '' },
        'CV': { gdp: 0, name: 'Cabo Verde', currency: '' },
        'LC': { gdp: 0, name: 'Saint Lucia', currency: '' },
        'GM': { gdp: 0, name: 'Gambia', currency: '' },
        'SC': { gdp: 0, name: 'Seychelles', currency: '' },
        'LS': { gdp: 0, name: 'Lesotho', currency: '' },
        'TL': { gdp: 0, name: 'Timor-Leste', currency: '' },
        'GW': { gdp: 0, name: 'Guinea-Bissau', currency: '' },
        'AG': { gdp: 0, name: 'Antigua and Barbuda', currency: '' },
        'SB': { gdp: 0, name: 'Solomon Islands', currency: '' },
        'KM': { gdp: 0, name: 'Comoros', currency: '' },
        'GD': { gdp: 0, name: 'Grenada', currency: '' },
        'VU': { gdp: 0, name: 'Vanuatu', currency: '' },
        'VC': { gdp: 0, name: 'St. Vincent & Grenadines', currency: '' },
        'KN': { gdp: 0, name: 'Saint Kitts & Nevis', currency: '' },
        'WS': { gdp: 0, name: 'Samoa', currency: '' },
        'ST': { gdp: 0, name: 'Sao Tome & Principe', currency: '' },
        'DM': { gdp: 0, name: 'Dominica', currency: '' },
        'FM': { gdp: 0, name: 'Micronesia', currency: '' },
        'PW': { gdp: 0, name: 'Palau', currency: '' },
        'KI': { gdp: 0, name: 'Kiribati', currency: '' },
        'MH': { gdp: 0, name: 'Marshall Islands', currency: '' },
        'TV': { gdp: 0, name: 'Tuvalu', currency: '' },   
};

function updateGdpByCountry() {
    const countrySelector = document.getElementById('countrySelector');
    const gdpInput = document.getElementById('nationalGdp');
    const gdpSource = document.getElementById('nationalGdpSource');
    const currencySelector = document.getElementById('currencySelector');
    const exchangeRateInput = document.getElementById('currentExchangeRateInput');
    
    if (!countrySelector || !gdpInput || !gdpSource) return;
    
    const selectedCountry = countrySelector.value;
    
    if (selectedCountry === 'custom' || selectedCountry === '') {
        // Allow manual input for custom countries
        gdpInput.readOnly = false;
        gdpInput.placeholder = 'Enter GDP value manually';
        if (selectedCountry === 'custom') {
            gdpSource.value = 'Custom value - please specify source';
        }
        return;
    }
    
    const countryData = COUNTRY_GDP_DATA[selectedCountry];
    if (countryData) {
        // Debug logging
        console.log('Setting GDP for country:', selectedCountry, 'GDP value:', countryData.gdp);
        console.log('GDP input element before:', gdpInput.value);
        
        // Update GDP
        gdpInput.value = countryData.gdp;
        gdpInput.readOnly = false; // Allow editing even after selection
        gdpSource.value = `${countryData.name} - World Bank/IMF World Economic Outlook 2024`;
        
        // Debug logging after setting
        console.log('GDP input element after:', gdpInput.value);
        
        // Simple approach - just set the value and trigger events
        gdpInput.value = countryData.gdp;
        gdpInput.dispatchEvent(new Event('input', { bubbles: true }));
        gdpInput.dispatchEvent(new Event('change', { bubbles: true }));
        updateGdpInWords();
        
        console.log('Final GDP input value:', gdpInput.value);
        
        // Auto-select currency based on country
        const countryCurrency = COUNTRY_CURRENCY_MAP[selectedCountry];
        if (countryCurrency && currencySelector) {
            currencySelector.value = countryCurrency;
            
            // Auto-populate exchange rate
            if (exchangeRateInput && EXCHANGE_RATES[countryCurrency]) {
                exchangeRateInput.value = EXCHANGE_RATES[countryCurrency].defaultRateFromUSD;
            }
            
            // Update formatter to match the new currency
            updateFormatter(countryCurrency, true);
        }
        
        // Update the GDP in words display
        updateGdpInWords();
        
        // Recalculate the model with new GDP value
        calculateModel();
    }
}

// --- IMPORTANT: Current Exchange Rates (90-day averages approximated) ---
const EXCHANGE_RATES = {
    'USD': { defaultRateFromUSD: 1.0, locale: 'en-US', symbol: '$' },
    'EUR': { defaultRateFromUSD: 0.853, locale: 'de-DE', symbol: '€' },
    'GBP': { defaultRateFromUSD: 0.738, locale: 'en-GB', symbol: '£' },
    'JPY': { defaultRateFromUSD: 147.5, locale: 'ja-JP', symbol: '¥' },
    'CAD': { defaultRateFromUSD: 1.384, locale: 'en-CA', symbol: 'C$' },
    'AUD': { defaultRateFromUSD: 1.482, locale: 'en-AU', symbol: 'A$' },
    'CHF': { defaultRateFromUSD: 0.933, locale: 'de-CH', symbol: 'Fr.' },
    'SEK': { defaultRateFromUSD: 10.42, locale: 'sv-SE', symbol: 'kr' },
    'NOK': { defaultRateFromUSD: 10.85, locale: 'no-NO', symbol: 'kr' },
    'DKK': { defaultRateFromUSD: 6.36, locale: 'da-DK', symbol: 'kr' },
    'PLN': { defaultRateFromUSD: 3.87, locale: 'pl-PL', symbol: 'zł' },
    'CZK': { defaultRateFromUSD: 22.65, locale: 'cs-CZ', symbol: 'Kč' },
    'HUF': { defaultRateFromUSD: 355.2, locale: 'hu-HU', symbol: 'Ft' },
    'CNY': { defaultRateFromUSD: 7.12, locale: 'zh-CN', symbol: '¥' },
    'INR': { defaultRateFromUSD: 83.25, locale: 'hi-IN', symbol: '₹' },
    'KRW': { defaultRateFromUSD: 1325.5, locale: 'ko-KR', symbol: '₩' },
    'SGD': { defaultRateFromUSD: 1.315, locale: 'en-SG', symbol: 'S$' },
    'HKD': { defaultRateFromUSD: 7.78, locale: 'zh-HK', symbol: 'HK$' },
    'NZD': { defaultRateFromUSD: 1.612, locale: 'en-NZ', symbol: 'NZ$' },
    'ZAR': { defaultRateFromUSD: 17.85, locale: 'en-ZA', symbol: 'R' },
    'BRL': { defaultRateFromUSD: 5.52, locale: 'pt-BR', symbol: 'R$' },
    'MXN': { defaultRateFromUSD: 19.72, locale: 'es-MX', symbol: '$' },
    'RUB': { defaultRateFromUSD: 96.25, locale: 'ru-RU', symbol: '₽' }
};

// --- Country to Currency Mapping ---
const COUNTRY_CURRENCY_MAP = {
    'United States': 'USD',
    'Canada': 'CAD',
    'United Kingdom': 'GBP',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Netherlands': 'EUR',
    'Belgium': 'EUR',
    'Austria': 'EUR',
    'Portugal': 'EUR',
    'Finland': 'EUR',
    'Ireland': 'EUR',
    'Luxembourg': 'EUR',
    'Greece': 'EUR',
    'Japan': 'JPY',
    'Australia': 'AUD',
    'Switzerland': 'CHF',
    'Sweden': 'SEK',
    'Norway': 'NOK',
    'Denmark': 'DKK',
    'Singapore': 'SGD',
    'Hong Kong': 'HKD',
    'China': 'CNY',
    'India': 'INR',
    'South Korea': 'KRW',
    'New Zealand': 'NZD',
    'Mexico': 'MXN',
    'Brazil': 'BRL',
    'South Africa': 'ZAR',
    'Russia': 'RUB',
    'Thailand': 'THB',
    'Turkey': 'TRY',
    'Poland': 'PLN'
};

// --- Definitions for Info Icons/Tooltips ---
const INFO_DEFINITIONS = {
    currencySettings: {
        label: "Currency Settings",
        description: "Exchange rates shown are historical averages. Please adjust the rates according to current market values for more accurate projections.",
        uniqueCode: "CURRENCYSETS"
    },
    nationalGdp: {
        label: "Country's Gross Domestic Product (GDP) - Base Year",
        description: `The total monetary value of all finished goods and services produced within a country's borders in the starting year (${START_YEAR}). This is the foundational economic indicator for the top-down approach.`,
        uniqueCode: "NATLGDPTOTAL"
    },
    nationalGdpGrowthRate: {
        label: "National GDP Annual Growth Rate",
        description: "The projected annual percentage increase of the country's Gross Domestic Product (GDP). This value is used if 'Use Fixed Annual Rate' is selected.",
        uniqueCode: "GDPGRWTHRATE"
    },
    militaryGdpAllocation: {
        label: "Percentage of GDP Allocated to Military Spending",
        description: "The specific percentage of the country's GDP that is designated for overall military expenditure. This value is used if 'Use Fixed Annual Rate' is selected.",
        uniqueCode: "MILGDPCENTAG"
    },
    overallCyberActivitiesApportionment: {
        label: "Percentage of Military Budget for All Cyber Activities",
        description: "The percentage of the total military budget that is specifically allocated to cover all cyber-related activities. This value is used if 'Use Fixed Annual Rate' is selected.",
        uniqueCode: "OVRCYBACTAPP"
    },
    cyberDefenseCenterSocAllocation: {
        label: "Percentage of Cyber Activities Budget for CDC & SOC Combined",
        description: "The percentage of the 'Overall Cyber Activities Budget' that is specifically dedicated to the CDC and the multiple SOCs.",
        uniqueCode: "CYBDEFUSOCAL"
    },
    cyberDefenseVsSocSplit: {
        label: "Allocation Split: CDC vs. SOCs (% for CDC)",
        description: "The internal percentage breakdown of funds allocated between the dedicated CDC and multiple SOCs. This value represents the percentage for the CDC.",
        uniqueCode: "CYBDEFVSOCSP"
    },
    threatLandscape: {
        label: "Threat Landscape & Risk Assessment Input",
        description: "Qualitative and quantitative data derived from the analysis of the current and projected cyber threat landscape and associated risks. This input informs strategic allocation and prioritization decisions within the cyber defense budget.",
        uniqueCode: "THRTLNDRKSIN"
    },
    investmentParameters: {
        label: "Investment Parameters",
        description: "Key financial parameters that affect investment calculations. Annual Inflation Rate adjusts future costs for economic inflation, while Asset Lifecycle determines when technology assets require replacement or major upgrades (typically every 5 years for cyber defense equipment).",
        uniqueCode: "INVSTPARAMS1"
    },
    // People Cost Allocation Tooltips
    peopleCapexCosts: {
        label: "People - CapEx Costs",
        description: "Capital Expenditure refers to the funds an organization uses to acquire, upgrade, or maintain long-term assets.<br><br><strong>Examples include:</strong><ul><li>Purchase and setup of suitable office spaces</li><li>Initial purchase of office furniture and fixtures</li><li>Recruitment agency and marketing fees for specialist roles</li><li>Development of proprietary training and certification programs</li></ul>",
        uniqueCode: "PEOPLECAPEX1"
    },
    peopleBaselineOpex: {
        label: "People - Baseline OpEx Costs",
        description: "Baseline Operating Expenses represent the established, ongoing costs an organization incurs for its normal, day-to-day operations.<br><br><strong>Examples include:</strong><ul><li>Office rental and associated utilities costs</li><li>Ongoing salaries, benefits and payroll taxes</li><li>Routine recruitment and onboarding expenses</li><li>Professional development and training</li><li>Conference attendance and travel</li></ul>",
        uniqueCode: "PEOPLEBASEOPX"
    },
    peopleRecurringCapex: {
        label: "People - Recurring CapEx Costs",
        description: "Recurring Capital Expenditures are capital investments made repeatedly to maintain an organization's current operational capacity and replace aging assets.<br><br><strong>Examples include:</strong><ul><li>Expansion and setup of additional office space</li><li>Replacement of office furniture and fixtures</li><li>Further recruitment agency and marketing fees for specialist roles</li></ul>",
        uniqueCode: "PEOPLERECCPX1"
    },
    peopleIncrementalOpex: {
        label: "People - Incremental OpEx Costs",
        description: "Incremental Operating Expenses are additional operational costs incurred due to an increase in organizational activity, such as the launch of new projects, or expansion.<br><br><strong>Examples include:</strong><ul><li>Hiring costs for new teams/capabilities</li><li>Ad hoc ongoing salaries, benefits and payroll taxes</li><li>Specialized training for new threats and technologies</li><li>Temporary staffing for a project</li><li>Costs of running new or expanded certification programs</li><li>Higher utility costs</li></ul>",
        uniqueCode: "PEOPLEINCROPX"
    },
    // Process Cost Allocation Tooltips
    processCapexCosts: {
        label: "Process - CapEx Costs",
        description: "Capital Expenditure refers to the funds an organization uses to acquire, upgrade, or maintain long-term assets.<br><br><strong>Examples include:</strong><ul><li>External consultancy fees to assist with the creation of appropriate governance structures and services</li><li>One-time cost for external audit and certification</li></ul>",
        uniqueCode: "PROCESSCAPEX"
    },
    processBaselineOpex: {
        label: "Process - Baseline OpEx Costs",
        description: "Baseline Operating Expenses represent the established, ongoing costs an organization incurs for its normal, day-to-day operations.<br><br><strong>Examples include:</strong><ul><li>Ongoing external consultancy fees to assist with the creation of processes and metrics</li><li>Ongoing external audit and certification</li><li>Insurance premiums</li><li>Routine organizational administration, such as legal and accounting fees</li><li>Costs associated with continuous process improvement initiatives</li></ul>",
        uniqueCode: "PROCESSBASOPX"
    },
    processRecurringCapex: {
        label: "Process - Recurring CapEx Costs",
        description: "Recurring Capital Expenditures are capital investments made repeatedly to maintain an organization's current operational capacity and replace aging assets.<br><br><strong>Examples include:</strong><ul><li>External consultancy fees to assist with transformation programs</li><li>External consultancy fees to assist with optimization programs</li><li>Capitalized investment in developing new automated playbooks</li></ul>",
        uniqueCode: "PROCESSRECCX"
    },
    processIncrementalOpex: {
        label: "Process - Incremental OpEx Costs",
        description: "Incremental Operating Expenses are additional operational costs incurred due to an increase in organizational activity, such as the launch of new projects, or expansion.<br><br><strong>Examples include:</strong><ul><li>Ongoing external consultancy fees to assist with the optimization of processes and metrics</li><li>Costs of expanding compliance to new or updated regulatory frameworks</li><li>Running bug bounty or vulnerability programs</li></ul>",
        uniqueCode: "PROCESSINCOX"
    },
    // Technology Cost Allocation Tooltips
    technologyCapexCosts: {
        label: "Technology - CapEx Costs",
        description: "Capital Expenditure refers to the funds an organization uses to acquire, upgrade, or maintain long-term assets.<br><br><strong>Examples include:</strong><ul><li>Purchase of physical assets and equipment needed for operations</li><li>Initial procurement of core IT systems or platforms</li><li>Construction or major upgrades of facilities, data centers or infrastructure</li><li>One-time purchases of perpetual licenses</li></ul>",
        uniqueCode: "TECHCAPEXCO1"
    },
    technologyBaselineOpex: {
        label: "Technology - Baseline OpEx Costs",
        description: "Baseline Operating Expenses represent the established, ongoing costs an organization incurs for its normal, day-to-day operations.<br><br><strong>Examples include:</strong><ul><li>Recurring software usage or service subscriptions</li><li>Service provider consumption costs (Cloud or any other service that is consumed with a cost associated to it)</li><li>Maintenance and support contracts for hardware and software</li><li>Consumable supplies required for ongoing operations, such as replacement parts for hardware (e.g., cables, batteries, etc.)</li></ul>",
        uniqueCode: "TECHBASELOPX"
    },
    technologyRecurringCapex: {
        label: "Technology - Recurring CapEx Costs",
        description: "Recurring Capital Expenditures are capital investments made repeatedly to maintain an organization's current operational capacity and replace aging assets.<br><br><strong>Examples include:</strong><ul><li>Scheduled replacement or refresh cycles for IT equipment and infrastructure</li><li>Capitalized costs for major system upgrades or enhancements</li><li>Investments to expand capacity or capabilities</li></ul>",
        uniqueCode: "TECHRECCAPX1"
    },
    technologyIncrementalOpex: {
        label: "Technology - Incremental OpEx Costs",
        description: "Incremental Operating Expenses are additional operational costs incurred due to an increase in organizational activity, such as the launch of new projects, or expansion.<br><br><strong>Examples include:</strong><ul><li>Budgets for evaluating or piloting emerging solutions</li><li>Licenses for additional modules or advanced features on current IT platforms</li><li>Data wipe services to securely remove recoverable information from devices</li><li>Higher data transfer or bandwidth costs</li><li>Surge costs for cloud services during peak usage</li></ul>",
        uniqueCode: "TECHINCROPX1"
    }
};

let currentFormatter;
let narrativeData = {};
let yearlyCdcBudgets = []; // Store calculated CDC budgets (in USD) for the utilization section
let yearlySocBudgets = []; // Store calculated SOC budgets (in USD) for the utilization section
let yearlyCombinedBudgets = []; // Store calculated CDC+SOC combined budgets (in USD) for the utilization section

// --- Main Calculation Engine ---

function calculateModel() {
    const currencySelector = document.getElementById('currencySelector');
    const selectedCurrencyCode = currencySelector.value;
    const rateFromUSD = parseFloat(document.getElementById('currentExchangeRateInput').value);

    updateFormatter(selectedCurrencyCode);

    // --- 1. Retrieve Input Values ---
    const nationalGdpUSD = parseFloat(document.getElementById('nationalGdp').value);
    const initialCyberDefenseCenterSocAllocation = parseFloat(document.getElementById('cyberDefenseCenterSocAllocation').value) / 100;
    const cyberDefenseVsSocSplit = parseFloat(document.getElementById('cyberDefenseVsSocSplit').value) / 100;

    // --- 2. Initialize Data Arrays (all in USD) ---
    const years = Array.from({ length: YEARS_TO_PROJECT }, (_, i) => START_YEAR + i);
    const projGdp = new Array(YEARS_TO_PROJECT);
    const projMilitarySpend = new Array(YEARS_TO_PROJECT);
    const projOverallCyberSpend = new Array(YEARS_TO_PROJECT);
    const projCdcSocSpend = new Array(YEARS_TO_PROJECT);
    const projCdcSpend = new Array(YEARS_TO_PROJECT);
    const projSocSpend = new Array(YEARS_TO_PROJECT);

    // --- 3. NEW CALCULATION LOGIC BASED ON SPECIFICATIONS ---
    
    // Helper function to get rate for current year (only when in variable mode)
    const getYearlyRate = (inputId, year, defaultRate, isVariableMode) => {
        // Only check for yearly inputs if we're actually in variable mode
        if (!isVariableMode) {
            return defaultRate;
        }
        
        const yearlyInput = document.getElementById(`${inputId}${year}`);
        if (yearlyInput && yearlyInput.value !== '') {
            return parseFloat(yearlyInput.value) / 100;
        }
        return defaultRate;
    };

    // Check which inputs are using variable/customize yearly rates
    const gdpGrowthIsVariable = document.getElementById('gdpGrowthModeToggle').checked;
    const militaryAllocIsVariable = document.getElementById('militaryAllocModeToggle').checked;
    const cyberApportionmentIsVariable = document.getElementById('overallCyberActivitiesApportionmentModeToggle').checked;

    // Get fixed rates
    const fixedGdpGrowthRate = parseFloat(document.getElementById('nationalGdpGrowthRate').value) / 100;
    const fixedMilitaryAllocRate = parseFloat(document.getElementById('militaryGdpAllocation').value) / 100;
    const fixedCyberApportionmentRate = parseFloat(document.getElementById('overallCyberActivitiesApportionment').value) / 100;

    // YEAR-BY-YEAR CALCULATIONS
    for (let i = 0; i < YEARS_TO_PROJECT; i++) {
        const currentYear = START_YEAR + i;

        // STEP 1: Calculate GDP
        if (i === 0) {
            // Base year 2024
            projGdp[i] = nationalGdpUSD;
        } else {
            // Get GDP growth rate for this year
            let gdpGrowthRate;
            if (gdpGrowthIsVariable) {
                // In variable mode, get the specific yearly rate
                gdpGrowthRate = getYearlyRate('gdpGrowth', currentYear, fixedGdpGrowthRate, true);
            } else {
                // In fixed mode, always use the fixed rate from the input box
                gdpGrowthRate = fixedGdpGrowthRate;
            }
            
            projGdp[i] = projGdp[i - 1] * (1 + gdpGrowthRate);
        }

        // STEP 2: Calculate Military Budget
        if (i === 0) {
            // Base year: Calculate as percentage of GDP
            let militaryAllocRate;
            if (militaryAllocIsVariable) {
                militaryAllocRate = getYearlyRate('militaryAllocation', currentYear, fixedMilitaryAllocRate, true);
            } else {
                militaryAllocRate = fixedMilitaryAllocRate;
            }
            
            projMilitarySpend[i] = projGdp[i] * militaryAllocRate;
        } else {
            // Subsequent years: Always use allocation approach (percentage of GDP)
            let militaryAllocRate;
            if (militaryAllocIsVariable) {
                militaryAllocRate = getYearlyRate('militaryAllocation', currentYear, fixedMilitaryAllocRate, true);
            } else {
                militaryAllocRate = fixedMilitaryAllocRate;
            }
            projMilitarySpend[i] = projGdp[i] * militaryAllocRate;
        }

        // STEP 3: Calculate Cyber Budget (always as percentage of Military Budget)
        let cyberApportionmentRate;
        if (cyberApportionmentIsVariable) {
            cyberApportionmentRate = getYearlyRate('overallCyberActivitiesApportionment', currentYear, fixedCyberApportionmentRate, true);
        } else {
            cyberApportionmentRate = fixedCyberApportionmentRate;
        }
        
        projOverallCyberSpend[i] = projMilitarySpend[i] * cyberApportionmentRate;

        // STEP 4: Calculate CDC/SOC Combined Budget
        if (i === 0) {
            // Base year: Calculate as percentage of Cyber Budget
            projCdcSocSpend[i] = projOverallCyberSpend[i] * initialCyberDefenseCenterSocAllocation;
        } else {
            // Subsequent years: Always use allocation approach (percentage of current year's Cyber Budget)
            projCdcSocSpend[i] = projOverallCyberSpend[i] * initialCyberDefenseCenterSocAllocation;
        }

        // STEP 5: Split CDC/SOC Budget (always based on allocation split)
        projCdcSpend[i] = projCdcSocSpend[i] * cyberDefenseVsSocSplit;
        projSocSpend[i] = projCdcSocSpend[i] * (1 - cyberDefenseVsSocSplit);
    }
    
    yearlyCdcBudgets = [...projCdcSpend]; // Store for utilization section
    yearlySocBudgets = [...projSocSpend]; // Store for utilization section
    yearlyCombinedBudgets = [...projCdcSocSpend]; // Store for utilization section
    
    // Calculate investment breakdown whenever the model is updated
    const investmentBreakdownTotals = calculateInvestmentBreakdown();
    
    // Calculate comprehensive investment totals for all views
    const comprehensiveInvestmentTotals = calculateComprehensiveInvestmentTotals();

    // --- 4. Store Data for Narrative ---
    // Calculate cumulative totals for 2025-2040
    const cumulativeCdcSpend = projCdcSpend.reduce((sum, value) => sum + value, 0);
    const cumulativeSocSpend = projSocSpend.reduce((sum, value) => sum + value, 0);
    const cumulativeCdcSocSpend = projCdcSocSpend.reduce((sum, value) => sum + value, 0);
    
    narrativeData = {
        finalCdcSocSpend: projCdcSocSpend[YEARS_TO_PROJECT - 1],
        finalCdcSpend: projCdcSpend[YEARS_TO_PROJECT - 1],
        finalSocSpend: projSocSpend[YEARS_TO_PROJECT - 1],
        // Add 2025 (initial year) data
        initialCdcSpend: projCdcSpend[1], // Index 1 = 2025
        initialSocSpend: projSocSpend[1],
        initialCdcSocSpend: projCdcSocSpend[1],
        // Add cumulative totals from investment breakdown (sophisticated calculations)
        cumulativeCdcSpend: investmentBreakdownTotals ? investmentBreakdownTotals.total : cumulativeCdcSpend,
        cumulativeSocSpend: cumulativeSocSpend,
        cumulativeCdcSocSpend: cumulativeCdcSocSpend,
        // Store investment breakdown totals for detailed breakdown in narrative
        investmentBreakdownTotals: investmentBreakdownTotals,
        // Store comprehensive investment totals for all views
        comprehensiveInvestmentTotals: comprehensiveInvestmentTotals,
        threatLandscape: document.getElementById('threatLandscape').value,
        inputValues: {
            nationalGdp: document.getElementById('nationalGdp').value,
            nationalGdpSource: document.getElementById('nationalGdpSource').value,
            nationalGdpGrowthRate: document.getElementById('nationalGdpGrowthRate').value,
            nationalGdpGrowthRateSource: document.getElementById('nationalGdpGrowthRateSource').value,
            militaryGdpAllocation: document.getElementById('militaryGdpAllocation').value,
            militaryGdpAllocationSource: document.getElementById('militaryGdpAllocationSource').value,
            overallCyberActivitiesApportionment: document.getElementById('overallCyberActivitiesApportionment').value,
            overallCyberActivitiesApportionmentSource: document.getElementById('overallCyberActivitiesApportionmentSource').value,
            cyberDefenseCenterSocAllocation: document.getElementById('cyberDefenseCenterSocAllocation').value,
            cyberDefenseCenterSocAllocationSource: document.getElementById('cyberDefenseCenterSocAllocationSource').value,
            cyberDefenseVsSocSplit: document.getElementById('cyberDefenseVsSocSplit').value,
            cyberDefenseVsSocSplitSource: document.getElementById('cyberDefenseVsSocSplitSource').value,
            utilizationPeople: document.getElementById('utilizationPeople').value,
            utilizationProcess: document.getElementById('utilizationProcess').value,
            utilizationTechnology: document.getElementById('utilizationTechnology').value,
            // People Cost Allocation
            peopleCapex: document.getElementById('peopleCapex').value,
            peopleOpex: document.getElementById('peopleOpex').value,
            peopleRecCapex: document.getElementById('peopleRecCapex').value,
            peopleIncOpex: document.getElementById('peopleIncOpex').value,
            // Process Cost Allocation
            processCapex: document.getElementById('processCapex').value,
            processOpex: document.getElementById('processOpex').value,
            processRecCapex: document.getElementById('processRecCapex').value,
            processIncOpex: document.getElementById('processIncOpex').value,
            // Technology Cost Allocation
            techCapex: document.getElementById('techCapex').value,
            techOpex: document.getElementById('techOpex').value,
            techRecCapex: document.getElementById('techRecCapex').value,
            techIncOpex: document.getElementById('techIncOpex').value
        }
    };

    // --- 5. Populate Year-on-Year Summary Table ---
    populateSummaryTable(years, rateFromUSD, projGdp, projMilitarySpend, projOverallCyberSpend, projCdcSocSpend, projSocSpend, projCdcSpend);
    
    // --- 6. Calculate Investment Breakdown ---
    calculateInvestmentBreakdown();
}

function populateSummaryTable(years, rateFromUSD, ...dataArrays) {
    const combinedTableBody = document.querySelector('#yearlyCombinedSpendTable tbody');
    const headerRow = document.querySelector('#yearlyCombinedSpendTable thead tr');

    while (headerRow.children.length > 1) headerRow.removeChild(headerRow.lastChild);
    years.forEach(year => {
        const th = document.createElement('th');
        th.textContent = year;
        headerRow.appendChild(th);
    });

    // Correctly map data arrays to rows.
    // Row 4 = SOC Budget (data index 4), Row 5 = CDC Budget (data index 5)
    const mapping = [0, 1, 2, 3, 4, 5]; // GDP, Mil, Cyber, Combined, SOC, CDC
    mapping.forEach((dataIndex, rowIndex) => {
        const row = combinedTableBody.rows[rowIndex];
        const dataArray = dataArrays[dataIndex];
        while (row.cells.length > 1) row.deleteCell(1);
        dataArray.forEach(value => {
            row.insertCell().textContent = currentFormatter.format(value * rateFromUSD);
        });
    });
}

function generateNarrative() {
    const pptPeople = parseFloat(document.getElementById('utilizationPeople').value) / 100;
    const pptProcess = parseFloat(document.getElementById('utilizationProcess').value) / 100;
    const pptTech = parseFloat(document.getElementById('utilizationTechnology').value) / 100;
    
    const pptBoxes = [
        document.getElementById('ppt-box-people'),
        document.getElementById('ppt-box-process'),
        document.getElementById('ppt-box-tech')
    ];
    if (Math.abs(pptPeople + pptProcess + pptTech - 1) > 0.001) {
        pptBoxes.forEach(box => box.classList.add('error-state'));
    } else {
        pptBoxes.forEach(box => box.classList.remove('error-state'));
    }

    const getCostBreakdown = (type) => {
        const breakdown = {
            capex: parseFloat(document.getElementById(`${type}Capex`).value) / 100,
            opex: parseFloat(document.getElementById(`${type}Opex`).value) / 100,
            recCapex: parseFloat(document.getElementById(`${type}RecCapex`).value) / 100,
            incOpex: parseFloat(document.getElementById(`${type}IncOpex`).value) / 100
        };
        const inputs = ['Capex', 'Opex', 'RecCapex', 'IncOpex'].map(suffix => document.getElementById(`${type}${suffix}`));
        if (Math.abs(breakdown.capex + breakdown.opex + breakdown.recCapex + breakdown.incOpex - 1) > 0.001) {
            inputs.forEach(input => input.closest('.input-group').classList.add('error-state'));
        } else {
            inputs.forEach(input => input.closest('.input-group').classList.remove('error-state'));
        }
        return breakdown;
    };
    const peopleCosts = getCostBreakdown('people');
    const processCosts = getCostBreakdown('process');
    const techCosts = getCostBreakdown('tech');
    
    const rateFromUSD = parseFloat(document.getElementById('currentExchangeRateInput').value);

    // --- Generate Summary Cards Display ---
    const slider = document.getElementById('yearSlider');
    const selectedYear = parseInt(slider.value);
    const yearIndex = selectedYear - START_YEAR;
    const totalCdcBudget = yearlyCdcBudgets[yearIndex] || 0;
    const yearSince = selectedYear - START_YEAR;
    
    const peopleBudget = totalCdcBudget * pptPeople;
    const processBudget = totalCdcBudget * pptProcess;
    const techBudget = totalCdcBudget * pptTech;

    // Apply the same logic as the breakdown table for recurring capex
    const peopleComponents = {
        capex: yearSince === 0 ? peopleBudget * peopleCosts.capex : 0,  // Initial CAPEX only in first year
        opex: peopleBudget * peopleCosts.opex, 
        recCapex: yearSince > 0 ? peopleBudget * peopleCosts.recCapex : 0,  // Recurring CAPEX only after first year
        incOpex: peopleBudget * peopleCosts.incOpex 
    };
    const processComponents = {
        capex: yearSince === 0 ? processBudget * processCosts.capex : 0,  // Initial CAPEX only in first year
        opex: processBudget * processCosts.opex, 
        recCapex: yearSince > 0 ? processBudget * processCosts.recCapex : 0,  // Recurring CAPEX only after first year
        incOpex: processBudget * processCosts.incOpex 
    };
    const techComponents = {
        capex: yearSince === 0 ? techBudget * techCosts.capex : 0,  // Initial CAPEX only in first year
        opex: techBudget * techCosts.opex, 
        recCapex: yearSince > 0 ? techBudget * techCosts.recCapex : 0,  // Recurring CAPEX only after first year
        incOpex: techBudget * techCosts.incOpex 
    };

    const singleYearData = {
        people: { 
            total: peopleComponents.capex + peopleComponents.opex + peopleComponents.recCapex + peopleComponents.incOpex,
            ...peopleComponents
        },
        process: { 
            total: processComponents.capex + processComponents.opex + processComponents.recCapex + processComponents.incOpex,
            ...processComponents
        },
        technology: { 
            total: techComponents.capex + techComponents.opex + techComponents.recCapex + techComponents.incOpex,
            ...techComponents
        }
    };
    container.innerHTML = generateSummaryCards(singleYearData, rateFromUSD);
    setupInfoIcons();
}

function generateSummaryCards(data, rateFromUSD) {
    let cardsHtml = '<div class="summary-cards-container">';
    const categories = ['people', 'process', 'technology'];
    
    categories.forEach(cat => {
        const catData = data[cat];
        cardsHtml += `
            <div class="summary-card">
                <div class="card-header">
                    <h3>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
                    <div class="card-total">${currentFormatter.format(catData.total * rateFromUSD)}</div>
                </div>
                <div class="card-body">
                    <div class="card-item"><span>Capex</span> <span>${currentFormatter.format(catData.capex * rateFromUSD)}</span></div>
                    <div class="card-item"><span>Baseline Opex</span> <span>${currentFormatter.format(catData.opex * rateFromUSD)}</span></div>
                    <div class="card-item"><span>Recurring Capex</span> <span>${currentFormatter.format(catData.recCapex * rateFromUSD)}</span></div>
                    <div class="card-item"><span>Incremental Opex</span> <span>${currentFormatter.format(catData.incOpex * rateFromUSD)}</span></div>
                </div>
            </div>
        `;
    });
    
    cardsHtml += '</div>';
    return cardsHtml;
}

function generateDetailedTable(allYearsData, rateFromUSD) {
    const years = Array.from({ length: YEARS_TO_PROJECT }, (_, i) => START_YEAR + i);
    const costTypes = {
        capex: 'Capex Costs',
        opex: 'Baseline Opex',
        recCapex: 'Recurring Capex',
        incOpex: 'Incremental Opex'
    };

    let tableHtml = `
        <div class="table-container">
            <table id="utilizationDetailedTable">
                <thead>
                    <tr>
                        <th>Sub-Category</th>
                        ${years.map(year => `<th>${year}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>`;

    const createSection = (title, dataKey) => {
        let sectionHtml = `<tr><th class="tbody-header" colspan="${YEARS_TO_PROJECT + 1}">${title}</th></tr>`;
        
        Object.keys(costTypes).forEach(costKey => {
            sectionHtml += `<tr><td>${costTypes[costKey]}</td>`;
            allYearsData.forEach(yearData => {
                sectionHtml += `<td>${currentFormatter.format(yearData[dataKey][costKey] * rateFromUSD)}</td>`;
            });
            sectionHtml += `</tr>`;
        });

        sectionHtml += `<tr class="total-row"><td><strong>Total</strong></td>`;
        allYearsData.forEach(yearData => {
            sectionHtml += `<td><strong>${currentFormatter.format(yearData[dataKey].total * rateFromUSD)}</strong></td>`;
        });
        sectionHtml += `</tr>`;
        return sectionHtml;
    };

    tableHtml += createSection('People', 'people');
    tableHtml += createSection('Process', 'process');
    tableHtml += createSection('Technology', 'technology');
    
    // Grand Total Row
    tableHtml += `<tr class="grand-total-row"><td class="tbody-header"><strong>Grand Total CDC Budget</strong></td>`;
    yearlyCdcBudgets.forEach(total => {
        tableHtml += `<td class="tbody-header"><strong>${currentFormatter.format(total * rateFromUSD)}</strong></td>`;
    });
    tableHtml += `</tr>`;

    tableHtml += `</tbody></table></div>`;
    return tableHtml;
}


// --- Narrative Generation ---

function generateNarrative() {
    // Ensure we have fresh data by calling calculateModel first
    calculateModel();
    
    const data = narrativeData;
    const narrativeNumFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const narrativePercentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const currentCurrencyCode = document.getElementById('currencySelector').value;
    const currentRateFromUSD = parseFloat(document.getElementById('currentExchangeRateInput').value);
    const formatCurrency = (valueInUSD) => narrativeNumFormatter.format(valueInUSD * currentRateFromUSD) + ` ${currentCurrencyCode}`;
    const formatPercent = (value) => narrativePercentFormatter.format(value / 100);
    const inputValues = data.inputValues;

    // Helper function to calculate average of yearly rates
    const calculateYearlyAverage = (inputType) => {
        let sum = 0;
        let count = 0;
        for (let year = START_YEAR; year <= END_YEAR; year++) {
            const yearInput = document.getElementById(`${inputType}${year}`);
            if (yearInput && yearInput.value) {
                sum += parseFloat(yearInput.value);
                count++;
            }
        }
        return count > 0 ? sum / count : 0;
    };

    // Helper function to get the correct rate text and reference based on mode
    const getRateTextWithReference = (modeToggleId, fixedValue, inputType, sourceText) => {
        const isVariableMode = document.getElementById(modeToggleId).checked;
        if (isVariableMode) {
            const average = calculateYearlyAverage(inputType);
            return `${formatPercent(average)} (average based on customized yearly rates)${addReference(sourceText)}`;
        } else {
            return `${formatPercent(fixedValue)}${addReference(sourceText)}`;
        }
    };

    // Helper function to check if military allocation is variable
    const getMilitaryAllocationText = () => {
        const isVariableMode = document.getElementById('militaryAllocModeToggle').checked;
        if (isVariableMode) {
            const average = calculateYearlyAverage('militaryAlloc');
            return `${formatPercent(average)} (average based on customized yearly rates)${addReference(inputValues.militaryGdpAllocationSource)}`;
        } else {
            return `${formatPercent(inputValues.militaryGdpAllocation)}${addReference(inputValues.militaryGdpAllocationSource)}`;
        }
    };

    const references = [];
    let refCounter = 0;
    const addReference = (sourceText) => {
        if (!sourceText || sourceText.trim() === '') return '';
        refCounter++;
        references.push(`${refCounter}. ${sourceText.trim()}`);
        return ` (Ref ${refCounter})`;
    };
    
    let threatLandscapeSection = '';
    if (data.threatLandscape && data.threatLandscape.trim() !== '') {
        threatLandscapeSection = `
STRATEGIC CONTEXT AND THREAT LANDSCAPE:
${data.threatLandscape.trim()}
`;
    }

    let narrative = `

NOTE: DO NOT USE THE TEXT BELOW AS IS. THE TEXT BELOW IS AN EXAMPLE WHICH YOU MAY CHOOSE TO MODIFY AND USE AS THE BASIS FOR YOUR OWN INVESTMENT PLAN DOCUMENT.

CYBER DEFENSE INVESTMENT PLAN (${START_YEAR}-${END_YEAR})

EXECUTIVE SUMMARY:

In an era defined by geopolitical volatility and an increasingly sophisticated digital threat landscape, the imperative for robust national cyber defense has never been more critical. We face a unique confluence of state-sponsored cyber espionage, critical infrastructure targeting, and hybrid warfare tactics that demand continuous innovation and substantial investment in cyber defense capabilities. This document outlines a strategic investment plan to fortify our military's cyber capabilities through ${END_YEAR}, ensuring our ability to deter, detect, and decisively respond to cyber aggression, thereby safeguarding national security and upholding our commitments to total defense. Our top-down financial model provides a clear, adaptable framework for the establishment of a Cyber Defense Center (CDC), ensuring that every investment in the CDC contributes directly to enhancing our operational readiness and technological superiority in cyberspace.

The establishment of a CDC represents a strategic response to the growing complexity and sophistication of cyber threats facing modern military organizations. While existing Security Operations Centers (SOCs) and cyber defense capabilities provide essential protection to the military's respective branches and services, the distributed nature of these defenses often results in fragmented threat awareness, inconsistent security standards, and duplicated efforts across multiple organizational units. The CDC addresses these challenges by serving as a centralized hub of cyber defense excellence that enhances and coordinates existing capabilities rather than replacing them. By providing specialized expertise, advanced technologies, and standardized processes, the CDC transforms individual SOCs from isolated defensive positions into components of a unified, intelligence-driven cyber defense ecosystem that can effectively counter nation-state level threats and sophisticated attack campaigns.

The CDC’s comprehensive suite of capabilities is guided by four major strategic drivers, which define the core mission areas essential for effective cyber defense operations. These drivers are:

• Threat-Centric Capabilities: Developing deep understanding of adversary capabilities, intentions, and tactics to inform proactive defensive strategies.
• Strategic and Operational Cyber Situational Awareness: Providing real-time visibility into cyber operational environments to enable informed decision-making and rapid response.
• SOC Enablement and Resilience: Extending specialized cyber defense expertise and resources across all military units to enhance overall defensive posture.
• Cyber Governance and Management: Establishing robust governance frameworks, policies, and management structures to ensure effective operation and continuous improvement of the CDC and the SOCs within the military.

THREAT-CENTRIC CAPABILITIES

Military organizations face an unprecedented array of sophisticated adversaries who continuously evolve their tactics, techniques, and procedures. The foundation of effective cyber defense must therefore rest upon comprehensive understanding and proactive engagement with this dynamic threat landscape. Without deep insight into adversary capabilities and intentions, defense organizations are compelled to take a perpetual reactive posture, always responding to attacks rather than preventing them.

This reality necessitates a systematic approach to threat intelligence that transforms fragmented observations into actionable defensive strategies. Beginning with comprehensive threat intelligence collection and analysis, military cyber defenders must develop a detailed understanding of who their adversaries are, what capabilities they possess, and how they are likely to employ those capabilities against specific military assets. This intelligence foundation becomes even more critical when we consider that modern cyber threats are not opportunistic attacks but carefully orchestrated campaigns designed to achieve specific strategic objectives.

Building upon this intelligence foundation, systematic threat modeling becomes essential for translating general threat knowledge into specific defensive preparations. Military networks and systems present unique attack surfaces that differ significantly from civilian environments, requiring specialized analysis to understand how adversaries might exploit military-specific vulnerabilities. This modeling process enables defenders to anticipate attack vectors before they are exploited, allowing for proactive defensive measures rather than reactive responses.

However, understanding threats is insufficient without the capability to detect them when they materialize. This requirement drives the need for sophisticated detection engineering that goes beyond commercial security tools to address the specific threat environment facing military operations. Custom-engineered detection capabilities, distributed across the military’s SOCs, ensure that defensive systems can proactively detect the most relevant threats.

Finally, when threats do penetrate defensive measures, rapid and effective incident response becomes critical for minimizing damage and extracting maximum learning value from each encounter. Post-incident analysis transforms each security event into an opportunity for defensive improvement, ensuring that the organization becomes more resilient with each threat encountered rather than simply returning to previous vulnerability levels.

STRATEGIC AND OPERATIONAL CYBER SITUATIONAL AWARENESS

Military commanders have always recognized that superior situational awareness provides decisive advantage in any operational environment. In cyberspace, this fundamental principle becomes even more critical, as the speed of cyber operations can compress decision timelines from hours to seconds. The challenge facing military cyber defenders is that traditional situational awareness methods prove inadequate for understanding the complex, dynamic, and largely invisible nature of cyber operations.

This limitation creates an urgent requirement for specialized situational awareness capabilities that can provide real-time visibility into cyber operational environments. Effective situational awareness requires focused attention on the most critical assets and systems that support essential military operations. Without systematic asset management and prioritization, defensive resources become diluted across less important systems while critical capabilities remain vulnerable. This reality necessitates comprehensive critical asset management capabilities that form the digital terrain upon which situational awareness is built.

Equally important is the need to understand the digital terrain upon which cyber operations unfold. Without continuous monitoring and analysis of the digital terrain, cyber defenders operate essentially blind. Just as traditional military planning requires detailed analysis of geographical terrain features, cyber operations demand comprehensive understanding of network topologies, system interdependencies, and critical infrastructure relationships. This terrain analysis becomes essential for identifying anomalies, planning defensive strategies, and understanding how potential compromises might cascade through interconnected systems.

Finally, situational awareness capabilities provide little value if the resulting intelligence cannot be effectively shared across all levels of command and operational units. This requirement drives the need for sophisticated information management and dissemination capabilities that ensure critical cyber information flows efficiently throughout the military operations, enabling coordinated awareness and response across organizational boundaries.

SOC ENABLEMENT AND RESILIENCE

The complexity and sophistication of modern cyber threats far exceed the capacity of individual military units to address them independently. Most military organizations lack the specialized expertise, advanced technologies, and dedicated resources necessary to implement comprehensive cyber defense programs that can effectively counter nation-state level threats. This reality creates a critical requirement for centralized cyber defense expertise that can extend its capabilities across the broader military organization.

Without centralized support services, individual military units face a choice between accepting significant cyber vulnerabilities or diverting essential operational resources away from their primary missions to develop cyber defense capabilities. This dilemma becomes particularly acute when considering that cyber defense effectiveness requires not just initial implementation but continuous adaptation to evolving threats, technologies, and attack techniques.

The CDC addresses this challenge by serving as a force multiplier that extends specialized cyber defense capabilities across all supported military SOCs. Beginning with fundamental technical support services, the CDC ensures that personnel throughout the military organization can maintain operational effectiveness while adhering to essential security protocols. This support becomes critical because even the most sophisticated security technologies provide reduced protection if they are improperly configured, inconsistently applied, or circumvented by users who lack adequate training and support.

Building upon this foundation of technical support, the CDC provides ongoing advisory services that help supported SOCs adapt their security postures to address emerging threats and leverage new defensive capabilities. This advisory capability ensures that lessons learned from advanced threat research, incident response experiences, and defensive innovations are rapidly disseminated across all military units rather than remaining isolated within specialized cyber defense organizations.

For SOCs that lack the resources to implement comprehensive cyber defense programs independently, the CDC provides managed services that deliver security capabilities without requiring significant localized investment in specialized personnel, knowledge and technologies. This managed services approach ensures consistent security capabilities across all supported SOCs while optimizing resource utilization and avoiding duplication of expensive cyber defense infrastructure.

Finally, the CDC serves as the central hub for knowledge management and information sharing, both within the military organization and with external partners including allied nations and trusted civilian agencies. This coordination role becomes essential as cyber threats increasingly transcend organizational and national boundaries, requiring coordinated awareness and response efforts that leverage collective defensive capabilities and shared threat intelligence.

CYBER GOVERNANCE AND MANAGEMENT

The most sophisticated cyber defense technologies and trained personnel provide little operational value without robust administrative and governance frameworks that ensure consistent, efficient, and sustainable operations. Military cyber defense operations face unique challenges that civilian organizations rarely encounter, including complex security clearance requirements, strict regulatory internal and external compliance obligations, and the need to coordinate across multiple national partners and international allies. These challenges create an urgent requirement for dedicated governance capabilities that can manage the complex organizational, procedural, and relational aspects of military cyber defense operations.

Without effective governance, even well-intentioned cyber defense programs can fail due to inconsistent policy implementation, inadequate coordination, or inability to adapt to evolving operational requirements. The dynamic nature of cyber threats requires governance frameworks that can maintain operational discipline while providing sufficient flexibility to address emerging challenges and opportunities.

This requirement drives the need for comprehensive policy and standards management capabilities that establish clear guidance for all CDC and SOC operations while remaining adaptable to changing threat environments and technological innovations. Effective governance ensures that all defensive activities are conducted consistently and efficiently across multiple teams, technologies, and operational environments, while maintaining the high standards of accountability and documentation required for military operations.

Equally important is the need for sophisticated external coordination capabilities that can manage the complex relationships between military cyber defense operations and the broader ecosystem of allied forces, government agencies, law enforcement organizations, and private sector partners. Cyber incidents routinely transcend organizational boundaries, requiring coordinated response efforts that leverage diverse capabilities and authorities. Without dedicated coordination capabilities, these critical external relationships can become sources of inefficiencies rather than force multipliers that enhance overall defensive effectiveness.

INTEGRATED OPERATIONAL FRAMEWORK

These four key drivers work together to create a comprehensive cyber defense capability that addresses the full spectrum of operational requirements facing modern military organizations. Threat-Centric capabilities support the core defensive missions, while Situational Awareness enables informed decision-making based on real-time cyber terrain data. SOC Enablement and Resilience Support services extend common defense capabilities across the broader military organization, while Cyber Governance and Management ensures sustainable and effective operations.

The integration of these key drivers creates a force-multiplying effect where the effectiveness of each capability is enhanced by the others, resulting in a comprehensive cyber defense capability that is greater than the sum of its individual components. This integrated approach ensures that the CDC can fulfill its vision to support world-class cyber defense capabilities ensuring mission assurance.


${threatLandscapeSection}

ASSUMPTIONS AND FOUNDATIONAL METRICS:

This investment model is anchored by a starting National 2024 GDP of ${formatCurrency(inputValues.nationalGdp)}${addReference(inputValues.nationalGdpSource)}. Reflecting dynamic economic realities, this GDP is projected to grow annually at a rate of ${getRateTextWithReference('gdpGrowthModeToggle', inputValues.nationalGdpGrowthRate, 'gdpGrowth', inputValues.nationalGdpGrowthRateSource)}. Our military expenditure is set at ${getMilitaryAllocationText()} of the GDP. A critical ${getRateTextWithReference('overallCyberActivitiesApportionmentModeToggle', inputValues.overallCyberActivitiesApportionment, 'overallCyberActivitiesApportionment', inputValues.overallCyberActivitiesApportionmentSource)} of this military budget is strategically earmarked for comprehensive cyber activities. Of this, a substantial ${formatPercent(inputValues.cyberDefenseCenterSocAllocation)}${addReference(inputValues.cyberDefenseCenterSocAllocationSource)} is dedicated to the combined efforts of our Cyber Defense Center (CDC) and Security Operations Centers (SOCs). The division between the CDC and SOCs is set at ${formatPercent(inputValues.cyberDefenseVsSocSplit)}${addReference(inputValues.cyberDefenseVsSocSplitSource)} for CDC.

STRATEGIC ALLOCATION HIGHLIGHTS (2025 Seed Investment):

This plan establishes the critical foundation for cyber defense excellence, beginning with a strategic 2025 seed investment of ${formatCurrency(data.initialCdcSocSpend)} in our CDC and SOCs. This foundational allocation is distributed to establish both proactive defense capabilities and rapid incident response capacity:
• CDC Seed Investment: ${formatCurrency(data.initialCdcSpend)}
• SOCs Seed Investment: ${formatCurrency(data.initialSocSpend)}

INITIAL BUDGET ALLOCATION (2025):

CDC Initial Budget Breakdown:

The CDC's initial 2025 budget of ${formatCurrency(data.initialCdcSpend)} is strategically apportioned across the People, Process, and Technology (PPT) pillars to establish a robust foundation for cyber defense operations:

• People (${formatPercent(inputValues.utilizationPeople)}): Approximately ${formatCurrency(data.initialCdcSpend * inputValues.utilizationPeople / 100)}.
    - CapEx Costs (${formatPercent(inputValues.peopleCapex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationPeople / 100 * inputValues.peopleCapex / 100)} - Purchase and setup of suitable office spaces, initial office furniture and fixtures, recruitment agency fees for specialist roles, and development of proprietary training programs.
    - Baseline OpEx (${formatPercent(inputValues.peopleOpex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationPeople / 100 * inputValues.peopleOpex / 100)} - Office rental and utilities, ongoing salaries and benefits, routine recruitment and onboarding expenses, professional development and training, conference attendance and travel.
    - Recurring CapEx (0%): ${formatCurrency(0)} - Expansion and setup of additional office space, replacement of office furniture and fixtures, further recruitment agency fees for specialist roles.
    - Incremental OpEx (${formatPercent(inputValues.peopleIncOpex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationPeople / 100 * inputValues.peopleIncOpex / 100)} - Hiring costs for new teams/capabilities, ad hoc salaries and benefits, specialized training for new threats and technologies, temporary staffing for projects.

• Process (${formatPercent(inputValues.utilizationProcess)}): Approximately ${formatCurrency(data.initialCdcSpend * inputValues.utilizationProcess / 100)}.
    - CapEx Costs (${formatPercent(inputValues.processCapex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationProcess / 100 * inputValues.processCapex / 100)} - External consultancy fees for creating appropriate governance structures and services, one-time external audit and certification costs.
    - Baseline OpEx (${formatPercent(inputValues.processOpex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationProcess / 100 * inputValues.processOpex / 100)} - Ongoing external consultancy for processes and metrics, ongoing external audit and certification, insurance premiums, routine organizational administration including legal and accounting fees.
    - Recurring CapEx (0%): ${formatCurrency(0)} - External consultancy for transformation and optimization programs, capitalized investment in developing new automated playbooks.
    - Incremental OpEx (${formatPercent(inputValues.processIncOpex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationProcess / 100 * inputValues.processIncOpex / 100)} - Ongoing external consultancy for process optimization, costs of expanding compliance to new regulatory frameworks, running bug bounty and vulnerability programs.

• Technology (${formatPercent(inputValues.utilizationTechnology)}): Approximately ${formatCurrency(data.initialCdcSpend * inputValues.utilizationTechnology / 100)}.
    - CapEx Costs (${formatPercent(inputValues.techCapex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationTechnology / 100 * inputValues.techCapex / 100)} - Purchase of physical assets and equipment, initial procurement of core IT systems or platforms, construction or major upgrades of facilities and data centers, one-time purchases of perpetual licenses.
    - Baseline OpEx (${formatPercent(inputValues.techOpex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationTechnology / 100 * inputValues.techOpex / 100)} - Recurring software subscriptions, cloud service consumption costs, maintenance and support contracts for hardware and software, consumable supplies for ongoing operations.
    - Recurring CapEx (0%): ${formatCurrency(0)} - Scheduled replacement or refresh cycles for IT equipment and infrastructure, capitalized costs for major system upgrades, investments to expand capacity or capabilities.
    - Incremental OpEx (${formatPercent(inputValues.techIncOpex)}): ${formatCurrency(data.initialCdcSpend * inputValues.utilizationTechnology / 100 * inputValues.techIncOpex / 100)} - Budgets for evaluating emerging solutions, licenses for additional modules and advanced features, data wipe services, higher data transfer costs, surge costs for cloud services during peak usage.

Security Operations Center (SOC) Initial Budget Breakdown:

The SOCs' initial 2025 budget of ${formatCurrency(data.initialSocSpend)} is strategically apportioned across the People, Process, and Technology (PPT) pillars to establish a robust foundation for security operations and incident response:

TO BE CONFIRMED - NOT ENOUGH DATA IN THE MODEL TO CALCULATE THE VALUE

COMPREHENSIVE INVESTMENT ANALYSIS (2025-2040):

Over the 16-year investment period from 2025 to ${END_YEAR}, this analysis presents the complete financial commitment to national cyber defense capabilities. These figures are derived from the Full Investment Breakdown table and include sophisticated financial modeling with inflation adjustments, lifecycle refresh cycles, and detailed cost categorization across the People, Process, and Technology framework.

TOTAL INVESTMENT OVERVIEW:
${data.comprehensiveInvestmentTotals ? `
Total Combined CDC and SOC Investment (2025-2040): ${formatCurrency(data.comprehensiveInvestmentTotals.combined.total)}
• Total CDC Investment (2025-2040): ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.total)}
• Total SOC Investment (2025-2040): ${formatCurrency(data.comprehensiveInvestmentTotals.soc.total)}

DETAILED CDC INVESTMENT BREAKDOWN (2025-2040):
• Total CapEx: ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.capex)} - Initial capital expenditures for infrastructure, equipment, and major system acquisitions
• Total OpEx: ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.opex)} - Ongoing operational expenditures for software subscriptions, cloud services, and maintenance
• Total Recurring CapEx: ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.recCapex)} - Scheduled refresh cycles and capacity expansion investments
• Total Incremental OpEx: ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.incOpex)} - Additional operational costs for emerging technologies and enhanced capabilities

DETAILED SOC INVESTMENT BREAKDOWN (2025-2040):
TO BE CONFIRMED - NOT ENOUGH DATA IN THE MODEL TO CALCULATE THE VALUES

INVESTMENT ALLOCATION BY PPT FRAMEWORK:

Total Combined CDC and SOC Investment by PPT Framework (2025-2040):
• Combined People Investment (${formatPercent(inputValues.utilizationPeople)}): ${formatCurrency(data.comprehensiveInvestmentTotals.combined.total * inputValues.utilizationPeople / 100)} - Total investment in human capital development, recruitment, training, and retention across both CDC and SOC operations
• Combined Process Investment (${formatPercent(inputValues.utilizationProcess)}): ${formatCurrency(data.comprehensiveInvestmentTotals.combined.total * inputValues.utilizationProcess / 100)} - Total investment in governance frameworks, process optimization, compliance programs, and organizational development
• Combined Technology Investment (${formatPercent(inputValues.utilizationTechnology)}): ${formatCurrency(data.comprehensiveInvestmentTotals.combined.total * inputValues.utilizationTechnology / 100)} - Total investment in cyber defense technologies, infrastructure, platforms, and technological capabilities enhancement

Total CDC Investment by PPT Framework (2025-2040):
• CDC People Investment (${formatPercent(inputValues.utilizationPeople)}): ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.total * inputValues.utilizationPeople / 100)} - CDC-specific investment in human capital development, recruitment, training, and retention over the entire program period
• CDC Process Investment (${formatPercent(inputValues.utilizationProcess)}): ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.total * inputValues.utilizationProcess / 100)} - CDC-specific investment in governance frameworks, process optimization, and compliance programs
• CDC Technology Investment (${formatPercent(inputValues.utilizationTechnology)}): ${formatCurrency(data.comprehensiveInvestmentTotals.cdc.total * inputValues.utilizationTechnology / 100)} - CDC-specific investment in cyber defense technologies, infrastructure, and platforms

Total SOC Investment by PPT Framework (2025-2040):
TO BE CONFIRMED - NOT ENOUGH DATA IN THE MODEL TO CALCULATE THE VALUES
` : 'Investment breakdown calculations are being processed...'}

CONCLUSION:

This comprehensive investment plan provides a robust and adaptable financial roadmap for our nation's cyber defense capabilities through ${END_YEAR}. By strategically allocating resources across critical functions and fostering continuous development in People, Process, and Technology, we are committed to building a resilient, agile, and technologically superior cyber defense posture. This commitment is essential not only for safeguarding our national interests but also for strengthening our collective security within the NATO Alliance, ensuring we remain a formidable force in the digital domain.

NOTE: DO NOT USE THE TEXT ABOVE AS IS. THE TEXT ABOVE IS AN EXAMPLE WHICH YOU MAY CHOOSE TO MODIFY AND USE AS THE BASIS FOR YOUR OWN INVESTMENT PLAN DOCUMENT.

`;

    if (references.length > 0) {
        narrative += `\n\nREFERENCES:\n` + references.join('\n');
    }

    downloadAsFile(narrative, `Cyber_Defense_Investment_Plan_${new Date().toISOString().slice(0,10)}.txt`, 'text/plain;charset=utf-8;');
}


// --- Utility and Helper Functions ---

let currentTooltipElement = null;

function showTooltip(event) {
    hideTooltip();
    const infoId = event.currentTarget.dataset.infoId;
    const definition = INFO_DEFINITIONS[infoId];
    if (!definition) return;

    let tooltipContent = `<strong>${definition.label}</strong><br>${definition.description}`;

    const tooltipDiv = document.createElement('div');
    tooltipDiv.classList.add('custom-tooltip');
    tooltipDiv.innerHTML = tooltipContent;
    document.body.appendChild(tooltipDiv);
    currentTooltipElement = tooltipDiv;

    const iconRect = event.currentTarget.getBoundingClientRect();
    tooltipDiv.style.position = 'absolute';
    tooltipDiv.style.left = '0px';
    tooltipDiv.style.top = '0px';
    const tooltipRect = tooltipDiv.getBoundingClientRect();
    
    let top = window.scrollY + iconRect.bottom + 10;
    let left = window.scrollX + iconRect.left;

    if (left + tooltipRect.width > window.innerWidth) {
        left = window.scrollX + iconRect.right - tooltipRect.width;
    }
    if (top + tooltipRect.height > window.innerHeight && iconRect.top > tooltipRect.height) {
        top = window.scrollY + iconRect.top - tooltipRect.height - 10;
    }

    tooltipDiv.style.left = `${left}px`;
    tooltipDiv.style.top = `${top}px`;
    tooltipDiv.style.opacity = '1';
}

function hideTooltip() {
    if (currentTooltipElement) {
        currentTooltipElement.remove();
        currentTooltipElement = null;
    }
}

function setupInfoIcons() {
    document.querySelectorAll('.info-icon').forEach(icon => {
        icon.removeEventListener('mouseover', showTooltip); // Prevent duplicate listeners
        icon.removeEventListener('mouseout', hideTooltip);
        icon.addEventListener('mouseover', showTooltip);
        icon.addEventListener('mouseout', hideTooltip);
    });
}

function updateFormatter(currencyCode, isCurrencySelectorChange = false) {
    const currencyInfo = EXCHANGE_RATES[currencyCode];
    currentFormatter = new Intl.NumberFormat(currencyInfo.locale, {
        style: 'currency', currency: currencyCode, currencyDisplay: 'symbol',
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    const exchangeRateInput = document.getElementById('currentExchangeRateInput');
    if (exchangeRateInput && isCurrencySelectorChange) {
        exchangeRateInput.value = currencyInfo.defaultRateFromUSD.toFixed(4);
        exchangeRateInput.disabled = (currencyCode === 'USD');
    }
}

function createYearlyInputs(type, containerId, fixedInputId) {
    const container = document.getElementById(containerId);
    const fixedInput = document.getElementById(fixedInputId);
    if (!container || !fixedInput) {
        console.error(`Initialization failed for ${type}. Missing container or fixed input.`);
        return;
    }
    let headingText = '';
    if (type === 'gdpGrowth') headingText = 'Yearly GDP Growth Rates (%)';
    else if (type === 'militaryAllocation') headingText = 'Yearly Military Allocation (% of GDP)';
    else if (type === 'overallCyberActivitiesApportionment') headingText = 'Yearly Overall Cyber Activities Apportionment (%)';
    container.innerHTML = `<h4 class="grid-heading">${headingText}</h4>`;
    for (let year = START_YEAR; year <= END_YEAR; year++) {
        const div = document.createElement('div');
        div.className = 'yearly-input-item';
        
        // Special cases for 2024 default values
        let defaultValue;
        if (type === 'gdpGrowth' && year === 2024) {
            defaultValue = '0.00';
        } else if (type === 'militaryAllocation' && year === 2024) {
            defaultValue = '2.14';
        } else {
            defaultValue = parseFloat(fixedInput.value).toFixed(2);
        }
        
        div.innerHTML = `<label for="${type}${year}">${year}:</label><input type="number" id="${type}${year}" step="0.01" value="${defaultValue}">`;
        const input = div.querySelector('input');
        input.addEventListener('change', calculateModel);
        input.addEventListener('change', (e) => e.target.value = parseFloat(e.target.value).toFixed(2));
        container.appendChild(div);
    }
}

function toggleInputMode(modeType, isVariable) {
    const config = {
        gdpGrowth: { 
            fixed: 'nationalGdpGrowthRate', 
            container: 'yearlyGdpGrowthInputsContainer',
            fixedLabel: 'gdpGrowthModeFixedLabel',
            variableLabel: 'gdpGrowthModeVariableLabel',
            source: 'nationalGdpGrowthRateSource'
        },
        militaryAllocation: { 
            fixed: 'militaryGdpAllocation', 
            container: 'yearlyMilitaryAllocationInputsContainer',
            fixedLabel: 'militaryAllocModeFixedLabel',
            variableLabel: 'militaryAllocModeVariableLabel'
        },
        militarySpendProj: { 
            fixed: 'militarySpendProjectionRate', 
            container: 'yearlyMilitarySpendProjectionInputsContainer',
            fixedLabel: 'militarySpendProjModeFixedLabel',
            variableLabel: 'militarySpendProjModeVariableLabel'
        },
        overallCyberActivitiesApportionment: { 
            fixed: 'overallCyberActivitiesApportionment', 
            container: 'yearlyOverallCyberActivitiesApportionmentInputsContainer',
            fixedLabel: 'overallCyberActivitiesApportionmentModeFixedLabel',
            variableLabel: 'overallCyberActivitiesApportionmentModeVariableLabel'
        }
    };
    const modeConfig = config[modeType];
    const fixedRateInput = document.getElementById(modeConfig.fixed);
    const yearlyInputsContainer = document.getElementById(modeConfig.container);
    const fixedLabel = document.getElementById(modeConfig.fixedLabel);
    const variableLabel = document.getElementById(modeConfig.variableLabel);
    const isFixed = !isVariable;

    // Update label styles
    fixedLabel.classList.toggle('active', isFixed);
    variableLabel.classList.toggle('active', !isFixed);

    fixedRateInput.disabled = !isFixed;
    yearlyInputsContainer.style.display = isFixed ? 'none' : 'grid';
    
    if (isFixed) {
        // When switching to fixed mode, preserve the current fixed rate value
        // and clear the yearly inputs
        yearlyInputsContainer.innerHTML = '';
        
        // Reset source text to default when switching back to fixed mode for GDP growth
        if (modeType === 'gdpGrowth') {
            const sourceElement = document.getElementById('nationalGdpGrowthRateSource');
            if (sourceElement) {
                sourceElement.value = sourceElement.defaultValue || '';
            }
        }
    } else {
        // Create yearly inputs if they don't exist yet
        if (!yearlyInputsContainer.querySelector('.yearly-input-item')) {
            createYearlyInputs(modeType, modeConfig.container, modeConfig.fixed);
        } else {
            // If inputs exist, just update their values to match current fixed rate
            for (let year = START_YEAR; year <= END_YEAR; year++) {
                const yearInput = document.getElementById(`${modeType}${year}`);
                if (yearInput) {
                    yearInput.value = parseFloat(fixedRateInput.value).toFixed(2);
                }
            }
        }
    }
    
    // Always recalculate after toggling mode
    calculateModel();
    
    // Conflict warnings are no longer needed since military growth rate is removed
}

function updateConflictWarnings() {
    // No conflict warnings needed since military growth rate functionality is removed
}

function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    let csv = [];
    table.querySelectorAll('tr').forEach(tr => {
        let row = [];
        tr.querySelectorAll('th, td').forEach(td => {
            row.push(`"${td.innerText.trim().replace(/"/g, '""')}"`);
        });
        csv.push(row.join(','));
    });
    downloadAsFile(csv.join('\n'), `${filename}_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
}

function downloadAsFile(data, filename, type) {
    const blob = new Blob([data], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Format input values based on their type
function formatInputValue(element) {
    if (!element) return;
    
    const value = parseFloat(element.value);
    if (isNaN(value)) return;

    // Create wrapper if it doesn't exist
    let wrapper = element.nextElementSibling;
    if (!wrapper || !wrapper.classList.contains('formatted-value')) {
        wrapper = document.createElement('div');
        wrapper.className = 'formatted-value';
        element.parentNode.insertBefore(wrapper, element.nextSibling);
        // Hide the original input when not focused
        element.addEventListener('focus', () => {
            element.style.display = 'block';
            wrapper.style.display = 'none';
        });
        element.addEventListener('blur', () => {
            element.style.display = 'none';
            wrapper.style.display = 'block';
            formatInputValue(element);
        });
        // Initially hide the input
        element.style.display = 'none';
    }

    // Format based on input ID
    if (element.id === 'nationalGdp') {
        wrapper.textContent = currentFormatter.format(value);
    } else if (element.id.includes('GrowthRate') || 
               element.id.includes('Allocation') || 
               element.id === 'cyberDefenseVsSocSplit' || 
               element.id.includes('Apportionment') ||
               element.id === 'militarySpendProjectionRate' ||
               element.id === 'cdcSocSpendProjectionRate' ||
               element.id === 'inflationRate') {
        wrapper.textContent = value.toFixed(2) + '%';
    }

    wrapper.addEventListener('click', () => {
        element.style.display = 'block';
        wrapper.style.display = 'none';
        element.focus();
    });
}

// --- Initial Setup on DOM Load ---
// --- Investment Model Functions ---
function calculateInvestmentBreakdown() {
    const inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
    const lifecycleYears = parseInt(document.getElementById('assetLifecycle').value);
    const yearSlider = document.getElementById('yearSlider');
    const selectedYear = parseInt(yearSlider.value);
    const rateFromUSD = parseFloat(document.getElementById('currentExchangeRateInput').value);

    // Get allocation percentages
    const allocations = {
        people: parseFloat(document.getElementById('utilizationPeople').value) / 100,
        process: parseFloat(document.getElementById('utilizationProcess').value) / 100,
        tech: parseFloat(document.getElementById('utilizationTechnology').value) / 100
    };

    // Validate that Strategic Allocation percentages add up to 100%
    const pptBoxes = [
        document.getElementById('ppt-box-people'),
        document.getElementById('ppt-box-process'),
        document.getElementById('ppt-box-tech')
    ];
    if (Math.abs(allocations.people + allocations.process + allocations.tech - 1) > 0.001) {
        pptBoxes.forEach(box => box.classList.add('error-state'));
    } else {
        pptBoxes.forEach(box => box.classList.remove('error-state'));
    }

    // Get cost breakdowns
    const costStructures = {
        people: {
            capex: parseFloat(document.getElementById('peopleCapex').value) / 100,
            opex: parseFloat(document.getElementById('peopleOpex').value) / 100,
            recCapex: parseFloat(document.getElementById('peopleRecCapex').value) / 100,
            incOpex: parseFloat(document.getElementById('peopleIncOpex').value) / 100
        },
        process: {
            capex: parseFloat(document.getElementById('processCapex').value) / 100,
            opex: parseFloat(document.getElementById('processOpex').value) / 100,
            recCapex: parseFloat(document.getElementById('processRecCapex').value) / 100,
            incOpex: parseFloat(document.getElementById('processIncOpex').value) / 100
        },
        tech: {
            capex: parseFloat(document.getElementById('techCapex').value) / 100,
            opex: parseFloat(document.getElementById('techOpex').value) / 100,
            recCapex: parseFloat(document.getElementById('techRecCapex').value) / 100,
            incOpex: parseFloat(document.getElementById('techIncOpex').value) / 100
        }
    };

    // Validate that cost allocation percentages add up to 100% for each category
    ['people', 'process', 'tech'].forEach(type => {
        const costs = costStructures[type];
        const inputs = ['Capex', 'Opex', 'RecCapex', 'IncOpex'].map(suffix => document.getElementById(`${type}${suffix}`));
        if (Math.abs(costs.capex + costs.opex + costs.recCapex + costs.incOpex - 1) > 0.001) {
            inputs.forEach(input => input.closest('.input-group').classList.add('error-state'));
        } else {
            inputs.forEach(input => input.closest('.input-group').classList.remove('error-state'));
        }
    });

    // Calculate investment breakdown until 2040
    const breakdown = [];
    for (let year = selectedYear; year <= END_YEAR; year++) {
        const yearSince = year - selectedYear;
        const inflationMultiplier = Math.pow(1 + inflationRate, yearSince);
        const isLifecycleRefresh = yearSince > 0 && yearSince % lifecycleYears === 0;
        
        // Get the budget for this specific year based on the current view
        const yearIndex = year - START_YEAR;
        const totalBudgetForYear = getBudgetForYear(yearIndex);

        ['people', 'process', 'tech'].forEach(category => {
            const yearlyBudget = totalBudgetForYear * allocations[category] * inflationMultiplier;
            const costs = costStructures[category];
            
            // Different recurring capex logic for different categories
            let recCapexAmount = 0;
            if (category === 'tech') {
                // Technology: Recurring CAPEX every year (except first year to avoid double-counting)
                recCapexAmount = yearSince > 0 ? yearlyBudget * costs.recCapex : 0;
            } else {
                // People and Process: Recurring CAPEX every year (except first year to avoid double-counting)
                recCapexAmount = yearSince > 0 ? yearlyBudget * costs.recCapex : 0;
            }
            
            let entry = {
                year,
                category: category.charAt(0).toUpperCase() + category.slice(1),
                capex: yearSince === 0 ? yearlyBudget * costs.capex : 0,  // Initial CAPEX only in first year
                opex: yearlyBudget * costs.opex,  // Baseline OPEX every year
                recCapex: recCapexAmount,
                incOpex: yearlyBudget * costs.incOpex,  // Incremental OPEX every year
            };
            entry.total = entry.capex + entry.opex + entry.recCapex + entry.incOpex;
            breakdown.push(entry);
        });
    }

    // Update the table
    const tbody = document.getElementById('investmentBreakdownBody');
    tbody.innerHTML = '';
    
    let currentYear = null;
    let yearTotal = {
        capex: 0, opex: 0, recCapex: 0, incOpex: 0, total: 0
    };

    breakdown.forEach((entry, index) => {
        if (currentYear !== entry.year) {
            if (currentYear !== null) {
                // Add year total row
                const totalRow = document.createElement('tr');
                totalRow.classList.add('year-total');
                if ((currentYear - selectedYear) % lifecycleYears === 0) {
                    totalRow.classList.add('lifecycle-end');
                }
                totalRow.innerHTML = `
                    <td colspan="2"><strong>${currentYear} Total</strong></td>
                    <td><strong>${currentFormatter.format(yearTotal.capex * rateFromUSD)}</strong></td>
                    <td><strong>${currentFormatter.format(yearTotal.opex * rateFromUSD)}</strong></td>
                    <td><strong>${currentFormatter.format(yearTotal.recCapex * rateFromUSD)}</strong></td>
                    <td><strong>${currentFormatter.format(yearTotal.incOpex * rateFromUSD)}</strong></td>
                    <td><strong>${currentFormatter.format(yearTotal.total * rateFromUSD)}</strong></td>
                `;
                tbody.appendChild(totalRow);
            }
            currentYear = entry.year;
            yearTotal = {
                capex: 0, opex: 0, recCapex: 0, incOpex: 0, total: 0
            };
        }

        const row = document.createElement('tr');
        row.classList.add(`${entry.category.toLowerCase()}-row`);
        row.innerHTML = `
            <td>${entry.year}</td>
            <td>${entry.category}</td>
            <td>${currentFormatter.format(entry.capex * rateFromUSD)}</td>
            <td>${currentFormatter.format(entry.opex * rateFromUSD)}</td>
            <td>${currentFormatter.format(entry.recCapex * rateFromUSD)}</td>
            <td>${currentFormatter.format(entry.incOpex * rateFromUSD)}</td>
            <td>${currentFormatter.format(entry.total * rateFromUSD)}</td>
        `;
        tbody.appendChild(row);

        // Update year totals
        yearTotal.capex += entry.capex;
        yearTotal.opex += entry.opex;
        yearTotal.recCapex += entry.recCapex;
        yearTotal.incOpex += entry.incOpex;
        yearTotal.total += entry.total;

        // Add final year total if this is the last entry
        if (index === breakdown.length - 1) {
            const totalRow = document.createElement('tr');
            totalRow.classList.add('year-total');
            if ((currentYear - selectedYear) % lifecycleYears === 0) {
                totalRow.classList.add('lifecycle-end');
            }
            totalRow.innerHTML = `
                <td colspan="2"><strong>${currentYear} Total</strong></td>
                <td><strong>${currentFormatter.format(yearTotal.capex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(yearTotal.opex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(yearTotal.recCapex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(yearTotal.incOpex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(yearTotal.total * rateFromUSD)}</strong></td>
            `;
            tbody.appendChild(totalRow);
            
            // Calculate and add grand total row
            const grandTotal = {
                capex: 0,
                opex: 0,
                recCapex: 0,
                incOpex: 0,
                total: 0
            };
            
            // Sum up all entries
            breakdown.forEach(entry => {
                grandTotal.capex += entry.capex;
                grandTotal.opex += entry.opex;
                grandTotal.recCapex += entry.recCapex;
                grandTotal.incOpex += entry.incOpex;
                grandTotal.total += entry.total;
            });
            
            // Add grand total row
            const grandTotalRow = document.createElement('tr');
            grandTotalRow.classList.add('grand-total');
            grandTotalRow.innerHTML = `
                <td colspan="2"><strong>GRAND TOTAL (2024-2040)</strong></td>
                <td><strong>${currentFormatter.format(grandTotal.capex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(grandTotal.opex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(grandTotal.recCapex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(grandTotal.incOpex * rateFromUSD)}</strong></td>
                <td><strong>${currentFormatter.format(grandTotal.total * rateFromUSD)}</strong></td>
            `;
            tbody.appendChild(grandTotalRow);
        }
    });
    
    // Calculate grand totals from breakdown array for narrative generation
    const grandTotal = {
        capex: 0,
        opex: 0,
        recCapex: 0,
        incOpex: 0,
        total: 0
    };
    
    breakdown.forEach(entry => {
        grandTotal.capex += entry.capex;
        grandTotal.opex += entry.opex;
        grandTotal.recCapex += entry.recCapex;
        grandTotal.incOpex += entry.incOpex;
        grandTotal.total += entry.total;
    });
    
    // Return the grand totals for use in narrative generation
    return grandTotal;
}

function exportInvestmentBreakdown() {
    exportTableToCSV('investmentBreakdownTable', 'Investment_Breakdown');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currencySelector').value = 'USD';
    updateFormatter('USD', true);
    setupDecimalHandling();
    // Trigger initial calculation to ensure all values are properly formatted
    calculateModel();
    
    // Format all numeric inputs initially
    const numericInputs = [
        'nationalGdp',
        'nationalGdpGrowthRate',
        'militaryGdpAllocation',
        'militarySpendProjectionRate',
        'overallCyberActivitiesApportionment',
        'cyberDefenseCenterSocAllocation',
        'cyberDefenseVsSocSplit',
        'cdcSocSpendProjectionRate',
        'inflationRate'
    ];
    
    numericInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            formatInputValue(element);
            element.addEventListener('change', function() {
                calculateModel();
                formatInputValue(this);
            });
        }
    });

    document.getElementById('currencySelector').addEventListener('change', (e) => {
        updateFormatter(e.target.value, true);
        calculateModel();
    });
    document.getElementById('currentExchangeRateInput').addEventListener('change', calculateModel);

    ['gdpGrowth', 'militaryAllocation', 'militarySpendProj', 'overallCyberActivitiesApportionment'].forEach(type => {
        const config = {
            gdpGrowth: { container: 'yearlyGdpGrowthInputsContainer', fixed: 'nationalGdpGrowthRate', radioName: 'gdpGrowthMode' },
            militaryAllocation: { container: 'yearlyMilitaryAllocationInputsContainer', fixed: 'militaryGdpAllocation', radioName: 'militaryAllocMode' },
            militarySpendProj: { container: 'yearlyMilitarySpendProjectionInputsContainer', fixed: 'militarySpendProjectionRate', radioName: 'militarySpendProjMode' },
            overallCyberActivitiesApportionment: { container: 'yearlyOverallCyberActivitiesApportionmentInputsContainer', fixed: 'overallCyberActivitiesApportionment', radioName: 'overallCyberActivitiesApportionmentMode' }
        };
        createYearlyInputs(type, config[type].container, config[type].fixed);
        document.querySelectorAll(`input[name="${config[type].radioName}"]`).forEach(radio => {
            radio.addEventListener('change', () => {
                toggleInputMode(type.replace('Allocation', 'Alloc').replace('Projection', 'Proj'));
                calculateModel();
            });
        });
        toggleInputMode(type.replace('Allocation', 'Alloc').replace('Projection', 'Proj'));
    });

});

// ============================================================================
// TEST MODE FUNCTIONALITY - START (easily removable section)
// ============================================================================

function activateTestMode() {
    // Set GDP to 100 billion
    const gdpInput = document.getElementById('nationalGdp');
    if (gdpInput) {
        gdpInput.value = '100000000000';
        // Trigger the oninput event to update GDP words
        gdpInput.dispatchEvent(new Event('input'));
        // Trigger the onchange event to recalculate
        gdpInput.dispatchEvent(new Event('change'));
        updateGdpInWords(); // Update the GDP words display
    }
    
    // Set ALL "Use Fixed Annual Rate" inputs to 0% and ensure they're in fixed mode
    const fixedRateInputs = [
        { id: 'nationalGdpGrowthRate', toggleId: 'gdpGrowthModeToggle', toggleType: 'gdpGrowth' },
        { id: 'militaryGdpAllocation', toggleId: 'militaryAllocModeToggle', toggleType: 'militaryAllocation' },
        { id: 'militarySpendProjectionRate', toggleId: 'militarySpendProjModeToggle', toggleType: 'militarySpendProj' },
        { id: 'overallCyberActivitiesApportionment', toggleId: 'overallCyberActivitiesApportionmentModeToggle', toggleType: 'overallCyberActivitiesApportionment' },
        { id: 'cdcSocSpendProjectionRate', toggleId: 'cdcSocSpendProjModeToggle', toggleType: 'cdcSocSpendProj' }
    ];
    
    fixedRateInputs.forEach(input => {
        const inputElement = document.getElementById(input.id);
        const toggleElement = document.getElementById(input.toggleId);
        
        if (inputElement) {
            inputElement.value = '0.00';
            // Trigger change event
            inputElement.dispatchEvent(new Event('change'));
        }
        
        // Ensure we're in fixed mode (unchecked = fixed mode)
        if (toggleElement && toggleElement.checked) {
            toggleElement.checked = false;
            toggleInputMode(input.toggleType, false);
        }
    });
    
    // Set additional inputs to 0%
    const additionalInputs = [
        'cyberDefenseCenterSocAllocation',  // Percentage of Cyber Activities Budget for CDC & SOC Combined
        'cyberDefenseVsSocSplit',           // Allocation Split: CDC vs. SOCs (% for CDC)
        'inflationRate'                     // National Annual Inflation Rate
    ];
    
    additionalInputs.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.value = '0.00';
            // Trigger change event
            inputElement.dispatchEvent(new Event('change'));
        }
    });
    
    // Trigger calculation update
    calculateModel();
    
    // Visual feedback
    const testButton = document.getElementById('testModeButton');
    if (testButton) {
        const originalText = testButton.textContent;
        testButton.textContent = 'Test Mode Applied!';
        testButton.style.background = '#FF9000';
        setTimeout(() => {
            testButton.textContent = originalText;
            testButton.style.background = '#FF007F';
        }, 2000);
    }
    
    // Console log for debugging
    console.log('Test Mode activated:');
    console.log('GDP set to:', gdpInput ? gdpInput.value : 'not found');
    fixedRateInputs.forEach(input => {
        const inputElement = document.getElementById(input.id);
        console.log(`${input.id} set to:`, inputElement ? inputElement.value : 'not found');
    });
    additionalInputs.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        console.log(`${inputId} set to:`, inputElement ? inputElement.value : 'not found');
    });
}

// ============================================================================
// TEST MODE FUNCTIONALITY - END
// ============================================================================

// ============================================================================
// BUDGET UTILIZATION VIEW TOGGLE FUNCTIONALITY - START
// ============================================================================

// Global variable to track current utilization view
let currentUtilizationView = 'cdc'; // 'cdc', 'soc', or 'combined'

function switchUtilizationView(viewType) {
    // Update global variable
    currentUtilizationView = viewType;
    
    // Update button states
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${viewType}ViewBtn`).classList.add('active');
    
    // Update section title
    const titleElement = document.getElementById('utilizationSectionTitle');
    switch(viewType) {
        case 'cdc':
            titleElement.textContent = 'CDC Budget Utilization (2024-2040)';
            break;
        case 'soc':
            titleElement.textContent = 'SOC Budget Utilization (2024-2040)';
            break;
        case 'combined':
            titleElement.textContent = 'Combined CDC & SOC Budget Utilization (2024-2040)';
            break;
    }
    
    // Debug logging
    console.log(`Switching to ${viewType} view`);
    console.log(`Sample budget for year 0:`, getBudgetForYear(0));
    console.log(`Sample budget for year 5:`, getBudgetForYear(5));
    
    // Force recalculation of the investment breakdown table
    calculateInvestmentBreakdown();
    
    console.log(`Table updated for ${viewType} view`);
}

function getCurrentUtilizationBudgets() {
    // Get the year index for the current slider position
    const yearSlider = document.getElementById('yearSlider');
    const selectedYear = parseInt(yearSlider.value);
    const yearIndex = selectedYear - START_YEAR;
    
    return getBudgetForYear(yearIndex);
}

function getBudgetForYear(yearIndex) {
    // Get budget data based on current view for a specific year
    switch(currentUtilizationView) {
        case 'cdc':
            return yearlyCdcBudgets[yearIndex] || 0;
        case 'soc':
            return yearlySocBudgets[yearIndex] || 0;
        case 'combined':
            return yearlyCombinedBudgets[yearIndex] || 0;
        default:
            return yearlyCdcBudgets[yearIndex] || 0;
    }
}

function getCombinedCdcSocBudgetForYear(yearIndex) {
    // This function is now simplified since we have pre-calculated data
    return yearlyCombinedBudgets[yearIndex] || 0;
}

function calculateComprehensiveInvestmentTotals() {
    // Calculate comprehensive totals for CDC, SOC, and Combined investments
    // This function simulates running the investment breakdown for each view
    
    const originalView = currentUtilizationView;
    const inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
    const lifecycleYears = parseInt(document.getElementById('assetLifecycle').value);
    const yearSlider = document.getElementById('yearSlider');
    const selectedYear = parseInt(yearSlider.value);
    
    // Get allocation percentages
    const allocations = {
        people: parseFloat(document.getElementById('utilizationPeople').value) / 100,
        process: parseFloat(document.getElementById('utilizationProcess').value) / 100,
        tech: parseFloat(document.getElementById('utilizationTechnology').value) / 100
    };
    
    // Get cost breakdowns
    const costStructures = {
        people: {
            capex: parseFloat(document.getElementById('peopleCapex').value) / 100,
            opex: parseFloat(document.getElementById('peopleOpex').value) / 100,
            recCapex: parseFloat(document.getElementById('peopleRecCapex').value) / 100,
            incOpex: parseFloat(document.getElementById('peopleIncOpex').value) / 100
        },
        process: {
            capex: parseFloat(document.getElementById('processCapex').value) / 100,
            opex: parseFloat(document.getElementById('processOpex').value) / 100,
            recCapex: parseFloat(document.getElementById('processRecCapex').value) / 100,
            incOpex: parseFloat(document.getElementById('processIncOpex').value) / 100
        },
        tech: {
            capex: parseFloat(document.getElementById('techCapex').value) / 100,
            opex: parseFloat(document.getElementById('techOpex').value) / 100,
            recCapex: parseFloat(document.getElementById('techRecCapex').value) / 100,
            incOpex: parseFloat(document.getElementById('techIncOpex').value) / 100
        }
    };
    
    function calculateTotalsForView(viewType) {
        const totals = { capex: 0, opex: 0, recCapex: 0, incOpex: 0, total: 0 };
        
        for (let year = selectedYear; year <= END_YEAR; year++) {
            const yearSince = year - selectedYear;
            const inflationMultiplier = Math.pow(1 + inflationRate, yearSince);
            const yearIndex = year - START_YEAR;
            
            let totalBudgetForYear = 0;
            switch(viewType) {
                case 'cdc':
                    totalBudgetForYear = yearlyCdcBudgets[yearIndex] || 0;
                    break;
                case 'soc':
                    totalBudgetForYear = yearlySocBudgets[yearIndex] || 0;
                    break;
                case 'combined':
                    totalBudgetForYear = yearlyCombinedBudgets[yearIndex] || 0;
                    break;
            }
            
            ['people', 'process', 'tech'].forEach(category => {
                const yearlyBudget = totalBudgetForYear * allocations[category] * inflationMultiplier;
                const costs = costStructures[category];
                
                // Calculate costs for this year
                const capex = yearSince === 0 ? yearlyBudget * costs.capex : 0;
                const opex = yearlyBudget * costs.opex;
                const recCapex = yearSince > 0 ? yearlyBudget * costs.recCapex : 0;
                const incOpex = yearlyBudget * costs.incOpex;
                
                // Add to totals
                totals.capex += capex;
                totals.opex += opex;
                totals.recCapex += recCapex;
                totals.incOpex += incOpex;
                totals.total += capex + opex + recCapex + incOpex;
            });
        }
        
        return totals;
    }
    
    // Calculate totals for each view
    const cdcTotals = calculateTotalsForView('cdc');
    const socTotals = calculateTotalsForView('soc');
    const combinedTotals = calculateTotalsForView('combined');
    
    // Restore original view
    currentUtilizationView = originalView;
    
    return {
        cdc: cdcTotals,
        soc: socTotals,
        combined: combinedTotals
    };
}

// ============================================================================
// BUDGET UTILIZATION VIEW TOGGLE FUNCTIONALITY - END
// ============================================================================