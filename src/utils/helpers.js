// src/utils/helpers.js
// Utility functions for the Telegram Mini App

// Tagged template for HTML (enables Prettier formatting and syntax highlighting)
export const html = (strings, ...values) => {
	return strings.reduce((result, string, i) => {
		return result + string + (values[i] || '')
	}, '')
}

export const formatDate = date => {
	const options = { year: 'numeric', month: 'long', day: 'numeric' }
	return new Date(date).toLocaleDateString(undefined, options)
}

export const capitalizeFirstLetter = string => {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

export const isEmpty = obj => {
	return Object.keys(obj).length === 0
}

export const debounce = (func, delay) => {
	let timeoutId
	return (...args) => {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		timeoutId = setTimeout(() => {
			func.apply(null, args)
		}, delay)
	}
}

// Format numbers with thousands separator
export const formatNumber = num => {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Truncate text with ellipsis
export const truncate = (str, maxLength) => {
	if (str.length <= maxLength) return str
	return str.slice(0, maxLength - 3) + '...'
}

// Copy text to clipboard
export const copyToClipboard = async text => {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch (err) {
		console.error('Failed to copy:', err)
		return false
	}
}

// Validate Telegram user data
export const isValidTelegramUser = user => {
	return user && user.id && (user.username || user.first_name)
}

// Generate random ID
export const generateId = () => {
	return Math.random().toString(36).substr(2, 9)
}
