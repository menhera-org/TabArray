all:
	npm run build

clean:
	npm run clean

icons:
	./shellscripts/update-contextual-identities-icons.sh

amo-html:
	./shellscripts/build-amo-descriptions.sh
