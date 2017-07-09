{ pkgs ? import <nixpkgs> {} }:
  with pkgs;
  stdenv.mkDerivation {
    name = "js-resource-counter";
    src = ./.;
    buildInputs = [ nodejs python2 ];
  }
