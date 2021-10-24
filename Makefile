.PHONY: build serve

all: build serve

build:
	goo build site.yaml

serve: 
	goo serve site.yaml 3000
