{ pkgs ? import <nixpkgs> {} }:
  with pkgs;
  stdenv.mkDerivation {
    name = "js-resource-counter";
    buildInputs = [ nodejs python2 ];
  }
